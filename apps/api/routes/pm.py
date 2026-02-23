"""
Property Manager routes - PROPERTY_MANAGER role only.

Provides endpoints for property managers to view their property stats,
residents, and manage their dashboard.
"""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from db.users import get_user_by_id, get_all_users
from models.delivery import Delivery, DeliveryStatus
from models.user import UserRole, UserStatus, SubscriptionStatus
from services import property_service
from models.pm_preference import PMPreference
from models.property_reward import PropertyReward
from services.pm_computations import (
    compute_delivery_summary,
    compute_participation_rate,
    compute_plan_distribution,
    compute_reward_tier,
    compute_tier_progress,
    compute_upcoming_delivery_stats,
    filter_deliveries_by_status,
    paginate_items,
    sort_deliveries_descending,
)


router = APIRouter(prefix="/pm", tags=["pm"])


# =============================================================================
# Response Schemas
# =============================================================================

class PMPropertyInfo(BaseModel):
    """Property information for PM dashboard."""
    id: UUID
    name: str
    address: str
    delivery_cadence: str | None


class PMStatsResponse(BaseModel):
    """
    Property Manager dashboard stats.

    Includes property info, resident statistics, and delivery visibility.
    """
    property: PMPropertyInfo | None = Field(
        default=None,
        description="PM's assigned property (null if not assigned)"
    )
    total_residents: int = Field(
        default=0,
        description="Total number of residents at the property"
    )
    active_subscriptions: int = Field(
        default=0,
        description="Residents with ACTIVE subscription status"
    )
    paused_subscriptions: int = Field(
        default=0,
        description="Residents with PAUSED subscription status"
    )
    pending_activations: int = Field(
        default=0,
        description="Residents with CREATED subscription status"
    )
    next_delivery_date: datetime | None = Field(
        default=None,
        description="Date of the next scheduled delivery for the property"
    )
    upcoming_delivery_count: int = Field(
        default=0,
        description="Number of SCHEDULED deliveries with future dates"
    )
    participation_rate: float = Field(
        default=0.0,
        description="Percentage of residents with active subscriptions"
    )


class ResidentInfo(BaseModel):
    """Resident information for PM dashboard."""
    id: UUID
    email: str
    unit: str | None
    subscription_status: SubscriptionStatus
    subscription_plan: str | None


class PMResidentsResponse(BaseModel):
    """Response for GET /pm/residents endpoint."""
    property_name: str | None = Field(
        default=None,
        description="Name of the PM's assigned property"
    )
    residents: list[ResidentInfo] = Field(
        default_factory=list,
        description="List of residents at the property"
    )
    plan_distribution: "PlanDistribution" = Field(
        default_factory=lambda: PlanDistribution(),
        description="Breakdown of active subscriptions by plan tier"
    )


class PlanDistribution(BaseModel):
    """Breakdown of subscriptions by plan tier."""
    essential: int = 0
    signature: int = 0
    statement: int = 0


class PMDeliveryItem(BaseModel):
    """Single delivery record for PM delivery history."""
    id: UUID
    resident_email: str
    unit: str | None
    subscription_plan: str
    status: str
    scheduled_for: datetime
    delivered_at: datetime | None


class DeliverySummary(BaseModel):
    """Aggregated delivery counts by status for a time window."""
    delivered: int = 0
    skipped: int = 0
    missed: int = 0
    scheduled: int = 0


class PMDeliveriesResponse(BaseModel):
    """Response for GET /pm/deliveries endpoint."""
    deliveries: list[PMDeliveryItem] = Field(default_factory=list)
    summary: DeliverySummary = Field(default_factory=DeliverySummary)
    total: int = 0
    page: int = 1
    page_size: int = 20


class TierDefinition(BaseModel):
    """Definition of a reward tier with its thresholds and benefits."""
    name: str
    min_rate: int
    max_rate: int | None
    benefits: list[str]


class RewardTierInfo(BaseModel):
    """Current reward tier information for a property."""
    tier: str
    participation_rate: float
    benefits: list[str]
    next_tier: str | None
    progress_to_next: float
    threshold_for_next: int | None


class PMRewardsResponse(BaseModel):
    """Response for GET /pm/rewards endpoint."""
    current: RewardTierInfo
    tier_definitions: list[TierDefinition]


class NotificationPreferences(BaseModel):
    """Notification preference toggles for a property manager."""
    delivery_reminders: bool = True
    participation_updates: bool = True
    rewards_milestones: bool = True


class PMSettingsResponse(BaseModel):
    """Response for GET /pm/settings endpoint."""
    email: str
    property_name: str | None = None
    property_address: str | None = None
    notifications: NotificationPreferences = Field(default_factory=NotificationPreferences)


class PMSettingsUpdate(BaseModel):
    """Request body for PATCH /pm/settings endpoint."""
    notifications: NotificationPreferences


# =============================================================================
# Constants
# =============================================================================

TIER_BENEFITS = {
    "Bronze": ["Lobby arrangements monthly", "Quarterly showcase"],
    "Silver": [
        "Lobby arrangements monthly",
        "Quarterly showcase",
        "Bi-weekly arrangements",
        "Holiday specials",
    ],
    "Gold": [
        "Lobby arrangements monthly",
        "Quarterly showcase",
        "Bi-weekly arrangements",
        "Holiday specials",
        "Weekly arrangements",
        "Priority florist matching",
        "Newsletter feature",
    ],
}

TIER_DEFINITIONS = [
    TierDefinition(name="Bronze", min_rate=0, max_rate=49, benefits=TIER_BENEFITS["Bronze"]),
    TierDefinition(name="Silver", min_rate=50, max_rate=74, benefits=TIER_BENEFITS["Silver"]),
    TierDefinition(name="Gold", min_rate=75, max_rate=None, benefits=TIER_BENEFITS["Gold"]),
]


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/ping")
async def pm_ping(current_user: dict = Depends(require_role(["PROPERTY_MANAGER"]))):
    """Test endpoint - PROPERTY_MANAGER only."""
    return {"ok": True, "role": current_user["role"]}


@router.get("/stats", response_model=PMStatsResponse)
async def get_pm_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"]))
):
    """
    Get property manager dashboard statistics.

    PROPERTY_MANAGER role only.
    Returns property info and resident subscription statistics.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If PM has no property assigned, return empty stats
    if not user.property_id:
        return PMStatsResponse()

    # Get property info
    prop = property_service.get_property(db, user.property_id)
    if not prop:
        return PMStatsResponse()

    property_info = PMPropertyInfo(
        id=prop.id,
        name=prop.name,
        address=prop.address,
        delivery_cadence=prop.delivery_cadence
    )

    # Get all residents at this property
    all_users = await get_all_users(include_archived=False)
    residents = [
        u for u in all_users
        if u.property_id == user.property_id
        and u.role == UserRole.CUSTOMER
        and u.status == UserStatus.ACTIVE
    ]

    # Calculate stats
    total_residents = len(residents)
    active_count = sum(1 for r in residents if r.subscription_status == SubscriptionStatus.ACTIVE)
    paused_count = sum(1 for r in residents if r.subscription_status == SubscriptionStatus.PAUSED)
    pending_count = sum(1 for r in residents if r.subscription_status == SubscriptionStatus.CREATED)

    # Query upcoming deliveries (SCHEDULED status, future date) for this property
    now = datetime.now(timezone.utc)
    upcoming_deliveries = (
        db.query(Delivery)
        .filter(
            and_(
                Delivery.property_id == user.property_id,
                Delivery.status == DeliveryStatus.SCHEDULED,
                Delivery.scheduled_for > now,
                Delivery.archived_at.is_(None),
            )
        )
        .order_by(Delivery.scheduled_for.asc())
        .all()
    )

    upcoming_stats = compute_upcoming_delivery_stats(upcoming_deliveries, now)
    rate = compute_participation_rate(active_count, total_residents)

    return PMStatsResponse(
        property=property_info,
        total_residents=total_residents,
        active_subscriptions=active_count,
        paused_subscriptions=paused_count,
        pending_activations=pending_count,
        next_delivery_date=upcoming_stats["next_delivery_date"],
        upcoming_delivery_count=upcoming_stats["upcoming_delivery_count"],
        participation_rate=rate,
    )


@router.get("/residents", response_model=PMResidentsResponse)
async def get_pm_residents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"]))
):
    """
    Get list of residents at the property manager's property.

    PROPERTY_MANAGER role only.
    Returns residents with their subscription status and plan.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # If PM has no property assigned, return empty list
    if not user.property_id:
        return PMResidentsResponse()

    # Get property info
    prop = property_service.get_property(db, user.property_id)
    property_name = prop.name if prop else None

    # Get all residents at this property
    all_users = await get_all_users(include_archived=False)
    residents = [
        u for u in all_users
        if u.property_id == user.property_id
        and u.role == UserRole.CUSTOMER
        and u.status == UserStatus.ACTIVE
    ]

    # Convert to response format
    resident_infos = [
        ResidentInfo(
            id=r.id,
            email=r.email,
            unit=r.unit,
            subscription_status=r.subscription_status,
            subscription_plan=r.subscription_plan.value if r.subscription_plan else None
        )
        for r in residents
    ]

    return PMResidentsResponse(
        property_name=property_name,
        residents=resident_infos,
        plan_distribution=PlanDistribution(**compute_plan_distribution(residents)),
    )


@router.get("/deliveries", response_model=PMDeliveriesResponse)
async def get_pm_deliveries(
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    status: DeliveryStatus | None = Query(default=None, description="Optional status filter"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"])),
):
    """
    Get delivery history for the PM's property.

    PROPERTY_MANAGER role only.
    Returns paginated deliveries sorted by scheduled_for descending,
    with an optional status filter and a 90-day delivery summary.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.property_id:
        return PMDeliveriesResponse(page=page, page_size=page_size)

    # Query all non-archived deliveries for this property
    query = db.query(Delivery).filter(
        and_(
            Delivery.property_id == user.property_id,
            Delivery.archived_at.is_(None),
        )
    )
    all_deliveries = query.order_by(Delivery.scheduled_for.desc()).all()

    # Build a user lookup for resident info
    all_users = await get_all_users(include_archived=False)
    user_map = {u.id: u for u in all_users}

    # Compute 90-day summary from all deliveries (before filtering by status)
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    raw_summary = compute_delivery_summary(all_deliveries, cutoff)
    summary = DeliverySummary(**raw_summary)

    # Apply optional status filter
    if status is not None:
        filtered = filter_deliveries_by_status(all_deliveries, status.value)
    else:
        filtered = all_deliveries

    # Sort descending (already sorted from DB, but ensure consistency)
    sorted_deliveries = sort_deliveries_descending(filtered)

    total = len(sorted_deliveries)

    # Paginate
    page_items = paginate_items(sorted_deliveries, page, page_size)

    # Map to response items
    delivery_items = []
    for d in page_items:
        resident = user_map.get(d.user_id)
        delivery_items.append(PMDeliveryItem(
            id=d.id,
            resident_email=resident.email if resident else "unknown",
            unit=resident.unit if resident else None,
            subscription_plan=d.subscription_plan.value,
            status=d.status.value,
            scheduled_for=d.scheduled_for,
            delivered_at=d.delivered_at,
        ))

    return PMDeliveriesResponse(
        deliveries=delivery_items,
        summary=summary,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/rewards", response_model=PMRewardsResponse)
async def get_pm_rewards(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"])),
):
    """
    Get rewards tier for the PM's property.

    PROPERTY_MANAGER role only.
    Computes the current participation rate and reward tier,
    persists the result to the database, and returns tier info
    with benefits and progress toward the next tier.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.property_id:
        # No property assigned — return Bronze defaults
        tier = "Bronze"
        rate = 0.0
        progress = compute_tier_progress(rate, tier)
        return PMRewardsResponse(
            current=RewardTierInfo(
                tier=tier,
                participation_rate=rate,
                benefits=TIER_BENEFITS[tier],
                next_tier=progress["next_tier"],
                progress_to_next=progress["progress_to_next"],
                threshold_for_next=progress["threshold_for_next"],
            ),
            tier_definitions=TIER_DEFINITIONS,
        )

    # Compute participation rate from resident data
    all_users = await get_all_users(include_archived=False)
    residents = [
        u for u in all_users
        if u.property_id == user.property_id
        and u.role == UserRole.CUSTOMER
        and u.status == UserStatus.ACTIVE
    ]
    total_residents = len(residents)
    active_count = sum(
        1 for r in residents if r.subscription_status == SubscriptionStatus.ACTIVE
    )
    rate = compute_participation_rate(active_count, total_residents)
    tier = compute_reward_tier(rate)
    progress = compute_tier_progress(rate, tier)

    # Upsert property_rewards record
    reward = (
        db.query(PropertyReward)
        .filter(PropertyReward.property_id == user.property_id)
        .first()
    )
    if reward:
        reward.tier = tier
        reward.participation_rate = rate
        reward.updated_at = datetime.now(timezone.utc)
    else:
        reward = PropertyReward(
            property_id=user.property_id,
            tier=tier,
            participation_rate=rate,
        )
        db.add(reward)
    db.commit()

    return PMRewardsResponse(
        current=RewardTierInfo(
            tier=tier,
            participation_rate=rate,
            benefits=TIER_BENEFITS[tier],
            next_tier=progress["next_tier"],
            progress_to_next=progress["progress_to_next"],
            threshold_for_next=progress["threshold_for_next"],
        ),
        tier_definitions=TIER_DEFINITIONS,
    )


@router.get("/settings", response_model=PMSettingsResponse)
async def get_pm_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"])),
):
    """
    Get PM profile info and notification preferences.

    PROPERTY_MANAGER role only.
    Returns email, assigned property details, and notification preferences.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get property info if assigned
    property_name = None
    property_address = None
    if user.property_id:
        prop = property_service.get_property(db, user.property_id)
        if prop:
            property_name = prop.name
            property_address = prop.address

    # Get notification preferences (defaults if no record exists)
    pref = (
        db.query(PMPreference)
        .filter(PMPreference.user_id == user_id)
        .first()
    )

    if pref:
        notifications = NotificationPreferences(
            delivery_reminders=pref.delivery_reminders,
            participation_updates=pref.participation_updates,
            rewards_milestones=pref.rewards_milestones,
        )
    else:
        notifications = NotificationPreferences()

    return PMSettingsResponse(
        email=user.email,
        property_name=property_name,
        property_address=property_address,
        notifications=notifications,
    )


@router.patch("/settings", response_model=PMSettingsResponse)
async def update_pm_settings(
    body: PMSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["PROPERTY_MANAGER"])),
):
    """
    Update PM notification preferences.

    PROPERTY_MANAGER role only.
    Upserts the pm_preferences record and returns the full settings response.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Upsert pm_preferences record
    pref = (
        db.query(PMPreference)
        .filter(PMPreference.user_id == user_id)
        .first()
    )

    if pref:
        pref.delivery_reminders = body.notifications.delivery_reminders
        pref.participation_updates = body.notifications.participation_updates
        pref.rewards_milestones = body.notifications.rewards_milestones
        pref.updated_at = datetime.now(timezone.utc)
    else:
        pref = PMPreference(
            user_id=user_id,
            delivery_reminders=body.notifications.delivery_reminders,
            participation_updates=body.notifications.participation_updates,
            rewards_milestones=body.notifications.rewards_milestones,
        )
        db.add(pref)

    db.commit()

    # Build response with property info
    property_name = None
    property_address = None
    if user.property_id:
        prop = property_service.get_property(db, user.property_id)
        if prop:
            property_name = prop.name
            property_address = prop.address

    return PMSettingsResponse(
        email=user.email,
        property_name=property_name,
        property_address=property_address,
        notifications=NotificationPreferences(
            delivery_reminders=pref.delivery_reminders,
            participation_updates=pref.participation_updates,
            rewards_milestones=pref.rewards_milestones,
        ),
    )
