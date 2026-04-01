"""
Admin payout routes — florist payout management.

Payouts are calculated from actual delivered orders. For each delivery,
the payout amount is the florist's mapped product price for that tier
(from their Shopify tier mappings). If no mapping exists, a default
rate is used.

Endpoints:
- POST /admin/payouts/generate — calculate and record payouts for a date range
- GET  /admin/payouts — list payout history with florist names
"""

import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from models.delivery import Delivery, DeliveryStatus, SubscriptionPlan
from models.florist import Florist
from models.florist_tier_mapping import FloristTierMapping
from models.florist_connection import FloristConnection
from models.payment import FloristPayout, PayoutStatus
from models.property_assignment import PropertyAssignment

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/payouts", tags=["admin-payouts"])

# Fallback rates (cents) when a florist has no tier mapping for a plan.
# These should only apply to florists who haven't connected Shopify yet.
DEFAULT_RATES = {
    SubscriptionPlan.ESSENTIAL: 2000,  # $20
    SubscriptionPlan.SIGNATURE: 3500,  # $35
    SubscriptionPlan.STATEMENT: 5500,  # $55
}


def _get_florist_rates(db: Session, florist_id) -> dict[SubscriptionPlan, int]:
    """
    Build a tier → payout-cents map for a florist from their Shopify
    tier mappings. Falls back to DEFAULT_RATES for unmapped tiers.
    """
    rates = dict(DEFAULT_RATES)

    connection = (
        db.query(FloristConnection)
        .filter(FloristConnection.florist_id == florist_id)
        .first()
    )
    if not connection:
        return rates

    mappings = (
        db.query(FloristTierMapping)
        .filter(FloristTierMapping.connection_id == connection.id)
        .all()
    )
    for m in mappings:
        try:
            tier = SubscriptionPlan(m.tier)
            price_cents = int(Decimal(m.product_price) * 100)
            rates[tier] = price_cents
        except (ValueError, KeyError):
            continue

    return rates


class GeneratePayoutsRequest(BaseModel):
    period_start: datetime = Field(..., description="Start of payout period (inclusive)")
    period_end: datetime = Field(..., description="End of payout period (inclusive)")


class PayoutResponse(BaseModel):
    id: str
    florist_id: str
    florist_name: Optional[str] = None
    amount_cents: int
    delivery_count: int = 0
    status: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class GeneratePayoutsResponse(BaseModel):
    payouts_created: int
    total_amount_cents: int
    total_deliveries: int
    details: list[PayoutResponse]


@router.post("/generate", response_model=GeneratePayoutsResponse)
async def generate_payouts(
    data: GeneratePayoutsRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"])),
):
    """
    Calculate florist payouts for delivered orders in a date range.

    For each delivery:
    1. Find the florist assigned to the delivery's property
    2. Look up the florist's Shopify tier mapping price for that plan
    3. Sum amounts per florist and create payout records
    """
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
        return GeneratePayoutsResponse(
            payouts_created=0, total_amount_cents=0, total_deliveries=0, details=[]
        )

    # Map property → florist
    assignments = (
        db.query(PropertyAssignment)
        .filter(PropertyAssignment.active.is_(True))
        .all()
    )
    property_to_florist = {a.property_id: a.florist_id for a in assignments}

    # Cache florist rates
    florist_rates_cache: dict = {}
    florist_totals: dict = {}  # florist_id → {amount, count}

    for d in deliveries:
        florist_id = property_to_florist.get(d.property_id)
        if not florist_id:
            continue

        if florist_id not in florist_rates_cache:
            florist_rates_cache[florist_id] = _get_florist_rates(db, florist_id)

        rates = florist_rates_cache[florist_id]
        rate = rates.get(d.subscription_plan, DEFAULT_RATES.get(d.subscription_plan, 2000))

        entry = florist_totals.setdefault(florist_id, {"amount": 0, "count": 0})
        entry["amount"] += rate
        entry["count"] += 1

    # Create payout records
    payouts = []
    for florist_id, totals in florist_totals.items():
        payout = FloristPayout(
            florist_id=florist_id,
            amount_cents=totals["amount"],
            status=PayoutStatus.PENDING,
            period_start=data.period_start,
            period_end=data.period_end,
        )
        db.add(payout)
        payouts.append((payout, totals["count"]))

    db.commit()
    for p, _ in payouts:
        db.refresh(p)

    # Resolve florist names
    florist_names = {}
    if payouts:
        florist_ids = [p.florist_id for p, _ in payouts]
        florists = db.query(Florist).filter(Florist.id.in_(florist_ids)).all()
        florist_names = {f.id: f.name for f in florists}

    details = [
        PayoutResponse(
            id=str(p.id),
            florist_id=str(p.florist_id),
            florist_name=florist_names.get(p.florist_id),
            amount_cents=p.amount_cents,
            delivery_count=count,
            status=p.status.value if hasattr(p.status, "value") else p.status,
            period_start=p.period_start,
            period_end=p.period_end,
            created_at=p.created_at,
        )
        for p, count in payouts
    ]

    return GeneratePayoutsResponse(
        payouts_created=len(payouts),
        total_amount_cents=sum(p.amount_cents for p, _ in payouts),
        total_deliveries=sum(c for _, c in payouts),
        details=details,
    )


@router.get("/", response_model=list[PayoutResponse])
async def list_payouts(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"])),
):
    """List florist payout history with florist names, most recent first."""
    payouts = (
        db.query(FloristPayout)
        .order_by(FloristPayout.created_at.desc())
        .limit(limit)
        .all()
    )

    # Resolve florist names
    florist_ids = list({p.florist_id for p in payouts})
    florists = db.query(Florist).filter(Florist.id.in_(florist_ids)).all() if florist_ids else []
    florist_names = {f.id: f.name for f in florists}

    return [
        PayoutResponse(
            id=str(p.id),
            florist_id=str(p.florist_id),
            florist_name=florist_names.get(p.florist_id),
            amount_cents=p.amount_cents,
            delivery_count=0,
            status=p.status.value if hasattr(p.status, "value") else p.status,
            period_start=p.period_start,
            period_end=p.period_end,
            created_at=p.created_at,
        )
        for p in payouts
    ]
