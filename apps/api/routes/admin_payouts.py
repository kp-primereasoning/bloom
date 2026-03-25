"""
Admin payout routes — florist payout management.

Endpoints:
- POST /admin/payouts/generate — calculate and record payouts for a date range
- GET  /admin/payouts — list payout history
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from models.delivery import Delivery, DeliveryStatus, SubscriptionPlan
from models.payment import FloristPayout, PayoutStatus
from models.property_assignment import PropertyAssignment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/payouts", tags=["admin-payouts"])

# Payout rates per plan tier (cents) — configurable
PAYOUT_RATES = {
    SubscriptionPlan.ESSENTIAL: 2500,   # $25
    SubscriptionPlan.SIGNATURE: 4500,   # $45
    SubscriptionPlan.STATEMENT: 7500,   # $75
}


class GeneratePayoutsRequest(BaseModel):
    period_start: datetime = Field(..., description="Start of payout period (inclusive)")
    period_end: datetime = Field(..., description="End of payout period (inclusive)")


class PayoutResponse(BaseModel):
    id: str
    florist_id: str
    amount_cents: int
    status: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GeneratePayoutsResponse(BaseModel):
    payouts_created: int
    total_amount_cents: int
    details: list[PayoutResponse]


@router.post("/generate", response_model=GeneratePayoutsResponse)
async def generate_payouts(
    data: GeneratePayoutsRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"])),
):
    """
    Calculate florist payouts for delivered orders in a date range.

    Groups delivered orders by the florist assigned to each property,
    sums up payout amounts based on plan tier rates, and creates
    FloristPayout records.
    """
    # Get all DELIVERED deliveries in the period
    deliveries = (
        db.query(Delivery)
        .filter(
            Delivery.status == DeliveryStatus.DELIVERED,
            Delivery.delivered_at >= data.period_start,
            Delivery.delivered_at <= data.period_end,
            Delivery.archived_at.is_(None),
        )
        .all()
    )

    if not deliveries:
        return GeneratePayoutsResponse(payouts_created=0, total_amount_cents=0, details=[])

    # Get active property-florist assignments
    assignments = (
        db.query(PropertyAssignment)
        .filter(PropertyAssignment.active.is_(True))
        .all()
    )
    property_to_florist = {a.property_id: a.florist_id for a in assignments}

    # Aggregate amounts per florist
    florist_totals: dict = {}
    for d in deliveries:
        florist_id = property_to_florist.get(d.property_id)
        if not florist_id:
            continue
        rate = PAYOUT_RATES.get(d.subscription_plan, 2500)
        florist_totals.setdefault(florist_id, 0)
        florist_totals[florist_id] += rate

    # Create payout records
    payouts = []
    for florist_id, amount in florist_totals.items():
        payout = FloristPayout(
            florist_id=florist_id,
            amount_cents=amount,
            status=PayoutStatus.PENDING,
            period_start=data.period_start,
            period_end=data.period_end,
        )
        db.add(payout)
        payouts.append(payout)

    db.commit()
    for p in payouts:
        db.refresh(p)

    return GeneratePayoutsResponse(
        payouts_created=len(payouts),
        total_amount_cents=sum(p.amount_cents for p in payouts),
        details=[
            PayoutResponse(
                id=str(p.id),
                florist_id=str(p.florist_id),
                amount_cents=p.amount_cents,
                status=p.status.value if hasattr(p.status, "value") else p.status,
                period_start=p.period_start,
                period_end=p.period_end,
                created_at=p.created_at,
            )
            for p in payouts
        ],
    )


@router.get("/", response_model=list[PayoutResponse])
async def list_payouts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"])),
):
    """List florist payout history, most recent first."""
    payouts = (
        db.query(FloristPayout)
        .order_by(FloristPayout.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        PayoutResponse(
            id=str(p.id),
            florist_id=str(p.florist_id),
            amount_cents=p.amount_cents,
            status=p.status.value if hasattr(p.status, "value") else p.status,
            period_start=p.period_start,
            period_end=p.period_end,
            created_at=p.created_at,
        )
        for p in payouts
    ]
