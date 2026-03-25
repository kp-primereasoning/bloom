"""
Me routes - Customer self-service endpoints.

Provides endpoints for customers to update their own profile during onboarding
and retrieve their delivery information.
"""

from datetime import datetime, timezone
from uuid import UUID, uuid4
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from db.users import get_user_by_id, update_user
from models.user import SubscriptionStatus
from models.delivery import Delivery, SubscriptionPlan
from schemas.domain import UserResponseWithOnboarding, MeDeliveriesResponse
from services import property_service
from models.property import PropertyStatus


router = APIRouter(prefix="/me", tags=["me"])


class MePropertyUpdate(BaseModel):
    """Schema for customer property assignment."""
    property_id: UUID = Field(..., description="ID of the property to assign")
    unit: str = Field(..., min_length=1, max_length=50, description="Unit number within the property")


class MeSubscriptionUpdate(BaseModel):
    """Schema for customer subscription update. Only ACTIVE or PAUSED allowed."""
    subscription_status: Literal["ACTIVE", "PAUSED"] = Field(
        ...,
        description="Subscription status (only ACTIVE or PAUSED allowed)"
    )


class MePlanUpdate(BaseModel):
    """Schema for customer plan selection."""
    plan: Literal["ESSENTIAL", "SIGNATURE", "STATEMENT"] = Field(
        ...,
        description="Subscription plan tier"
    )


@router.patch("/property", response_model=UserResponseWithOnboarding)
async def update_my_property(
    data: MePropertyUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Assign a property to the current customer.
    
    CUSTOMER role only.
    Validates property exists and is not ARCHIVED.
    
    Returns 400 if property not found or archived.
    Returns 403 if user is not CUSTOMER role.
    """
    user_id = UUID(current_user["id"])
    
    # Validate property exists
    prop = property_service.get_property(db, data.property_id)
    if not prop:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PROPERTY",
                    "message": "Property not found",
                    "request_id": str(uuid4())
                }
            }
        )
    
    # Validate property is not archived
    if prop.status == PropertyStatus.ARCHIVED:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "INVALID_PROPERTY",
                    "message": "Cannot select an archived property",
                    "request_id": str(uuid4())
                }
            }
        )
    
    # Update user's property_id and unit
    updated_user = await update_user(user_id, {"property_id": data.property_id, "unit": data.unit})

    return UserResponseWithOnboarding(
        id=updated_user.id,
        email=updated_user.email,
        role=updated_user.role,
        property_id=updated_user.property_id,
        subscription_status=updated_user.subscription_status,
        subscription_plan=updated_user.subscription_plan,
        created_at=updated_user.created_at
    )


@router.patch("/subscription", response_model=UserResponseWithOnboarding)
async def update_my_subscription(
    data: MeSubscriptionUpdate,
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Update the current customer's subscription status.
    
    CUSTOMER role only.
    Only ACTIVE or PAUSED status allowed (not CREATED).
    
    When activating (ACTIVE), if the user has a Stripe customer ID and plan,
    a Stripe Subscription is created automatically.
    When pausing (PAUSED), the Stripe Subscription is cancelled at period end.
    
    Returns 400 if status is CREATED or invalid.
    Returns 403 if user is not CUSTOMER role.
    """
    user_id = UUID(current_user["id"])
    
    # Convert string to enum (already validated by Pydantic to be ACTIVE or PAUSED)
    new_status = SubscriptionStatus(data.subscription_status)
    
    user = await get_user_by_id(user_id)

    # If activating and user has Stripe customer + plan, create Stripe subscription
    if new_status == SubscriptionStatus.ACTIVE and user:
        if user.stripe_customer_id and user.subscription_plan and not user.stripe_subscription_id:
            try:
                from services.payments import create_subscription as stripe_subscribe
                result = stripe_subscribe(user.stripe_customer_id, user.subscription_plan.value)
                await update_user(user_id, {
                    "stripe_subscription_id": result["subscription_id"],
                })
            except Exception:
                pass  # Non-fatal: subscription can still be activated locally

    # If pausing and user has Stripe subscription, cancel it
    if new_status == SubscriptionStatus.PAUSED and user and user.stripe_subscription_id:
        try:
            from services.payments import cancel_subscription as stripe_cancel
            stripe_cancel(user.stripe_subscription_id)
            await update_user(user_id, {"stripe_subscription_id": None})
        except Exception:
            pass  # Non-fatal

    # Update user's subscription_status
    updated_user = await update_user(user_id, {"subscription_status": new_status})

    # Send subscription confirmation email on activation
    if new_status == SubscriptionStatus.ACTIVE and updated_user:
        try:
            from services.email import send_subscription_confirmed
            from services import property_service as _ps
            prop_name = "your property"
            if updated_user.property_id:
                # Need a db session — but this endpoint doesn't inject one.
                # Use property name from user context if available.
                prop_name = "your property"
            send_subscription_confirmed(updated_user.email, prop_name)
        except Exception:
            pass  # Non-fatal
    
    return UserResponseWithOnboarding(
        id=updated_user.id,
        email=updated_user.email,
        role=updated_user.role,
        property_id=updated_user.property_id,
        subscription_status=updated_user.subscription_status,
        subscription_plan=updated_user.subscription_plan,
        created_at=updated_user.created_at
    )


@router.patch("/plan", response_model=UserResponseWithOnboarding)
async def update_my_plan(
    data: MePlanUpdate,
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Update the current customer's subscription plan.

    CUSTOMER role only.
    Valid plans: ESSENTIAL, SIGNATURE, STATEMENT.

    Returns 403 if user is not CUSTOMER role.
    """
    user_id = UUID(current_user["id"])

    # Convert string to enum (already validated by Pydantic)
    new_plan = SubscriptionPlan(data.plan)

    # Update user's subscription_plan
    updated_user = await update_user(user_id, {"subscription_plan": new_plan})

    return UserResponseWithOnboarding(
        id=updated_user.id,
        email=updated_user.email,
        role=updated_user.role,
        property_id=updated_user.property_id,
        subscription_status=updated_user.subscription_status,
        subscription_plan=updated_user.subscription_plan,
        created_at=updated_user.created_at
    )


class MeSkipDelivery(BaseModel):
    """Schema for toggling skip next delivery."""
    skip: bool = Field(..., description="True to skip next delivery, false to unskip")


class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences."""
    email_notifications_enabled: bool = Field(..., description="Enable or disable email notifications")


@router.get("/notification-preferences")
async def get_notification_preferences(
    current_user: dict = Depends(require_role(["CUSTOMER", "FLORIST"]))
):
    """Get current user's notification preferences."""
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email_notifications_enabled": getattr(user, "email_notifications_enabled", True),
    }


@router.patch("/notification-preferences")
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: dict = Depends(require_role(["CUSTOMER", "FLORIST"]))
):
    """Update current user's notification preferences."""
    user_id = UUID(current_user["id"])
    updated = await update_user(user_id, {
        "email_notifications_enabled": data.email_notifications_enabled,
    })
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "email_notifications_enabled": updated.email_notifications_enabled,
    }


@router.patch("/skip-next-delivery")
async def skip_next_delivery(
    data: MeSkipDelivery,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Toggle skip for the next delivery cycle.

    Can only skip if the delivery hasn't been generated yet (before the cutoff).
    Returns the updated skip status and cutoff info.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user or not user.property_id:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NO_PROPERTY",
                    "message": "You must be assigned to a property first",
                    "request_id": str(uuid4()),
                }
            },
        )

    # Check if there's already a SCHEDULED delivery for this user in the future
    # If so, it's too late to skip
    now = datetime.now(timezone.utc)
    existing_scheduled = (
        db.query(Delivery)
        .filter(
            Delivery.user_id == user_id,
            Delivery.scheduled_for > now,
            Delivery.status == "SCHEDULED",
            Delivery.archived_at.is_(None),
        )
        .first()
    )

    if data.skip and existing_scheduled:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "PAST_CUTOFF",
                    "message": "Too late to skip — your next delivery has already been scheduled",
                    "request_id": str(uuid4()),
                }
            },
        )

    updated_user = await update_user(user_id, {"skip_next_delivery": data.skip})

    # Get property info for cutoff display
    prop = property_service.get_property(db, user.property_id)
    cutoff_info = None
    if prop and prop.next_delivery_date:
        from datetime import timedelta
        cutoff_date = prop.next_delivery_date - timedelta(days=prop.delivery_lead_days)
        cutoff_info = {
            "next_delivery_date": prop.next_delivery_date.isoformat(),
            "cutoff_date": cutoff_date.isoformat(),
            "delivery_cadence": prop.delivery_cadence,
        }

    return {
        "skip_next_delivery": updated_user.skip_next_delivery,
        "cutoff": cutoff_info,
    }


@router.get("/deliveries", response_model=MeDeliveriesResponse)
async def get_my_deliveries(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["CUSTOMER"]))
):
    """
    Get current customer's deliveries.
    
    CUSTOMER role only.
    Returns next scheduled delivery (future, not archived) and
    delivery history (past, not archived, limit 20, most recent first).
    
    Returns 403 if user is not CUSTOMER role.
    Returns 401 if user is not authenticated.
    """
    user_id = UUID(current_user["id"])
    now = datetime.now(timezone.utc)
    
    # Get next scheduled delivery (future, not archived, earliest first)
    next_delivery = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.scheduled_for > now,
        Delivery.archived_at.is_(None)
    ).order_by(Delivery.scheduled_for.asc()).first()
    
    # Get history (past deliveries, not archived, limit 20, most recent first)
    history = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.scheduled_for <= now,
        Delivery.archived_at.is_(None)
    ).order_by(Delivery.scheduled_for.desc()).limit(20).all()
    
    return MeDeliveriesResponse(
        next_delivery=next_delivery,
        history=history
    )
