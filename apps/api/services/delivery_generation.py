"""
Delivery generation service.

Core orchestration logic: given a property with a delivery cadence and
a next_delivery_date, generate SCHEDULED deliveries for all eligible
subscribers when the delivery date falls within the lead-time window.

This module is designed to be called by a Lambda on a daily schedule,
but the logic is pure and testable without AWS dependencies.
"""

import logging
from datetime import datetime, timedelta, timezone, date
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from models.property import Property, PropertyStatus
from models.property_assignment import PropertyAssignment
from models.delivery import Delivery, DeliveryStatus, SubscriptionPlan
from models.user import User, UserRole, SubscriptionStatus

logger = logging.getLogger(__name__)

# Supported cadence values → timedelta between deliveries
CADENCE_MAP: dict[str, timedelta] = {
    "weekly": timedelta(weeks=1),
    "bi-weekly": timedelta(weeks=2),
    "monthly": timedelta(weeks=4),
}


def compute_next_delivery_date(
    current_next: datetime,
    cadence: str,
) -> Optional[datetime]:
    """
    Advance next_delivery_date by one cadence interval.

    Returns None if cadence is unrecognised.
    """
    delta = CADENCE_MAP.get(cadence)
    if not delta:
        return None
    return current_next + delta


def get_eligible_properties(db: Session, as_of: datetime) -> list[Property]:
    """
    Return ACTIVE properties whose next_delivery_date is within the
    lead-time window (i.e. next_delivery_date − lead_days <= as_of).

    Only properties with:
      - status == ACTIVE
      - delivery_cadence set
      - next_delivery_date set
      - an active florist assignment
    """
    properties = (
        db.query(Property)
        .filter(
            Property.status == PropertyStatus.ACTIVE,
            Property.delivery_cadence.isnot(None),
            Property.next_delivery_date.isnot(None),
        )
        .all()
    )

    eligible = []
    for prop in properties:
        cutoff = prop.next_delivery_date - timedelta(days=prop.delivery_lead_days)
        if as_of >= cutoff:
            # Verify there's an active florist assignment
            has_florist = (
                db.query(PropertyAssignment)
                .filter(
                    PropertyAssignment.property_id == prop.id,
                    PropertyAssignment.active == True,
                )
                .first()
            ) is not None
            if has_florist:
                eligible.append(prop)

    return eligible


async def get_active_subscribers(property_id: UUID) -> list[User]:
    """
    Get all customers with ACTIVE subscriptions for a given property
    who are not skipping the next delivery.

    Uses the in-memory user store.
    """
    from db.users import get_all_users

    all_users = await get_all_users()
    return [
        u
        for u in all_users
        if u.role == UserRole.CUSTOMER
        and u.property_id == property_id
        and u.subscription_status == SubscriptionStatus.ACTIVE
        and u.subscription_plan is not None
        and not u.skip_next_delivery
    ]


async def get_skipping_subscribers(property_id: UUID) -> list[User]:
    """Get customers who are skipping the next delivery (to clear their flag)."""
    from db.users import get_all_users

    all_users = await get_all_users()
    return [
        u
        for u in all_users
        if u.role == UserRole.CUSTOMER
        and u.property_id == property_id
        and u.subscription_status == SubscriptionStatus.ACTIVE
        and u.skip_next_delivery
    ]


def deliveries_already_exist(
    db: Session,
    property_id: UUID,
    delivery_date: datetime,
) -> bool:
    """Check if deliveries have already been generated for this property + date."""
    return (
        db.query(Delivery)
        .filter(
            Delivery.property_id == property_id,
            Delivery.scheduled_for == delivery_date,
            Delivery.archived_at == None,
        )
        .first()
    ) is not None


async def generate_deliveries_for_property(
    db: Session,
    prop: Property,
) -> dict:
    """
    Generate SCHEDULED deliveries for all eligible subscribers of a property.

    Returns a summary dict: {property_id, property_name, delivery_date,
    created, skipped, already_existed}.
    """
    from db.users import update_user

    delivery_date = prop.next_delivery_date
    property_id = prop.id

    result = {
        "property_id": str(property_id),
        "property_name": prop.name,
        "delivery_date": delivery_date.isoformat(),
        "created": 0,
        "skipped": 0,
        "already_existed": False,
    }

    # Idempotency check
    if deliveries_already_exist(db, property_id, delivery_date):
        result["already_existed"] = True
        logger.info(f"Deliveries already exist for {prop.name} on {delivery_date.date()}")
        return result

    # Check florist availability for this delivery day
    from models.florist_availability import FloristAvailability
    from models.property_assignment import PropertyAssignment as PA

    assignment = (
        db.query(PA)
        .filter(PA.property_id == property_id, PA.active == True)
        .first()
    )
    if assignment:
        dow = delivery_date.weekday()  # 0=Monday
        avail = (
            db.query(FloristAvailability)
            .filter(
                FloristAvailability.florist_id == assignment.florist_id,
                FloristAvailability.day_of_week == dow,
            )
            .first()
        )
        # If availability record exists and florist is unavailable, skip
        if avail and not avail.is_available:
            logger.info(
                f"Florist unavailable on day {dow} for {prop.name}, skipping generation"
            )
            result["skipped_reason"] = "florist_unavailable"
            return result

    # Get eligible subscribers (active, not skipping)
    subscribers = await get_active_subscribers(property_id)

    # If florist has a capacity cap, respect it
    max_cap = None
    if assignment:
        dow = delivery_date.weekday()
        avail = (
            db.query(FloristAvailability)
            .filter(
                FloristAvailability.florist_id == assignment.florist_id,
                FloristAvailability.day_of_week == dow,
            )
            .first()
        )
        if avail:
            max_cap = avail.max_deliveries_per_day

    if max_cap is not None and len(subscribers) > max_cap:
        logger.warning(
            f"Capping deliveries for {prop.name}: {len(subscribers)} subscribers but cap is {max_cap}"
        )
        subscribers = subscribers[:max_cap]

    # Create deliveries
    for user in subscribers:
        delivery = Delivery(
            user_id=user.id,
            property_id=property_id,
            subscription_plan=SubscriptionPlan(user.subscription_plan.value),
            status=DeliveryStatus.SCHEDULED,
            scheduled_for=delivery_date,
        )
        db.add(delivery)
        result["created"] += 1

        # Send delivery scheduled email notification
        try:
            from services.email import send_delivery_scheduled
            send_delivery_scheduled(
                to_email=user.email,
                delivery_date=delivery_date.strftime("%B %d, %Y"),
                property_name=prop.name,
            )
        except Exception as e:
            logger.debug(f"Failed to send delivery scheduled email to {user.email}: {e}")

    # Clear skip flags for users who skipped this cycle
    skippers = await get_skipping_subscribers(property_id)
    for user in skippers:
        await update_user(user.id, {"skip_next_delivery": False})
        result["skipped"] += 1

    # Advance the property's next_delivery_date
    new_next = compute_next_delivery_date(delivery_date, prop.delivery_cadence)
    if new_next:
        prop.next_delivery_date = new_next

    db.commit()

    logger.info(
        f"Generated {result['created']} deliveries for {prop.name} "
        f"on {delivery_date.date()}, {result['skipped']} skipped"
    )

    # Publish metric
    try:
        from services.metrics import record_deliveries_generated
        record_deliveries_generated(result["created"])
    except Exception:
        pass

    return result


async def run_delivery_generation(db: Session) -> list[dict]:
    """
    Main entry point: find all eligible properties and generate deliveries.

    Called by the Lambda handler (or manually for testing).
    Returns a list of per-property result summaries.
    """
    now = datetime.now(timezone.utc)
    eligible = get_eligible_properties(db, now)

    logger.info(f"Found {len(eligible)} eligible properties for delivery generation")

    results = []
    for prop in eligible:
        try:
            result = await generate_deliveries_for_property(db, prop)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to generate deliveries for {prop.name}: {e}")
            results.append({
                "property_id": str(prop.id),
                "property_name": prop.name,
                "error": str(e),
            })

    return results
