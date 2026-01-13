"""
Property Manager routes - PROPERTY_MANAGER role only.

Provides endpoints for property managers to view their property stats,
residents, and manage their dashboard.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from db.users import get_user_by_id, get_all_users
from models.user import UserRole, UserStatus, SubscriptionStatus
from services import property_service


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

    Includes property info and resident statistics.
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

    return PMStatsResponse(
        property=property_info,
        total_residents=total_residents,
        active_subscriptions=active_count,
        paused_subscriptions=paused_count,
        pending_activations=pending_count
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
        residents=resident_infos
    )
