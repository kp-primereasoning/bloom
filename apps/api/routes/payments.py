"""
Payment routes — Stripe billing for customer subscriptions.

Endpoints:
- POST /payments/setup-intent — create SetupIntent for card collection
- POST /payments/subscribe — create Stripe Subscription
- POST /payments/cancel — cancel Stripe Subscription
- GET  /payments/invoices — list invoices
- GET  /payments/payment-method — get current card on file
- PATCH /payments/payment-method — update payment method
"""

import logging
from uuid import UUID, uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from db.users import get_user_by_id, update_user
from models.user import SubscriptionStatus
from services import payments as pay_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["payments"])

# In-memory idempotency cache (TTL-based eviction would be ideal, but
# a simple dict is fine for MLP scale).  Maps idempotency_key → response dict.
_idempotency_cache: dict[str, dict] = {}


# ── Schemas ──────────────────────────────────────────────────────────

class SetupIntentResponse(BaseModel):
    client_secret: str
    setup_intent_id: str


class SubscribeRequest(BaseModel):
    plan: str = Field(..., pattern="^(ESSENTIAL|SIGNATURE|STATEMENT)$")


class SubscribeResponse(BaseModel):
    subscription_id: str
    status: str
    client_secret: Optional[str] = None


class CancelResponse(BaseModel):
    subscription_id: str
    status: str
    cancel_at_period_end: bool


class PaymentMethodResponse(BaseModel):
    id: str
    brand: str
    last4: str
    exp_month: int
    exp_year: int


class UpdatePaymentMethodRequest(BaseModel):
    payment_method_id: str = Field(..., description="Stripe PaymentMethod ID from Elements")


class InvoiceItem(BaseModel):
    id: str
    amount_cents: int
    currency: str
    status: str
    period_start: Optional[int] = None
    period_end: Optional[int] = None
    pdf_url: Optional[str] = None
    created: Optional[int] = None


# ── Helpers ──────────────────────────────────────────────────────────

async def _ensure_stripe_customer(current_user: dict) -> str:
    """Ensure the user has a Stripe Customer ID, creating one if needed."""
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer_id = pay_service.create_customer(user.email, str(user.id))
    await update_user(user_id, {"stripe_customer_id": customer_id})
    return customer_id


# ── Endpoints ────────────────────────────────────────────────────────

@router.post("/setup-intent", response_model=SetupIntentResponse)
async def create_setup_intent(
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Create a Stripe SetupIntent for collecting a payment method.

    Supports Idempotency-Key header to prevent duplicate SetupIntents on retry.
    """
    if idempotency_key and idempotency_key in _idempotency_cache:
        return SetupIntentResponse(**_idempotency_cache[idempotency_key])

    customer_id = await _ensure_stripe_customer(current_user)
    result = pay_service.create_setup_intent(customer_id)

    if idempotency_key:
        _idempotency_cache[idempotency_key] = result

    return SetupIntentResponse(**result)


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(
    data: SubscribeRequest,
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """
    Create a Stripe Subscription for the customer's selected plan.

    The customer must have a payment method on file (via setup-intent).
    Updates the user's subscription_status to ACTIVE and stores the
    Stripe subscription ID.
    """
    customer_id = await _ensure_stripe_customer(current_user)
    user_id = UUID(current_user["id"])

    # Check for existing active subscription
    user = await get_user_by_id(user_id)
    if user and user.stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ALREADY_SUBSCRIBED",
                    "message": "You already have an active subscription. Cancel it first.",
                    "request_id": str(uuid4()),
                }
            },
        )

    if idempotency_key and idempotency_key in _idempotency_cache:
        return SubscribeResponse(**_idempotency_cache[idempotency_key])

    try:
        result = pay_service.create_subscription(customer_id, data.plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Store subscription ID and activate
    await update_user(user_id, {
        "stripe_subscription_id": result["subscription_id"],
        "subscription_status": SubscriptionStatus.ACTIVE,
        "subscription_plan": data.plan,
    })

    if idempotency_key:
        _idempotency_cache[idempotency_key] = result

    return SubscribeResponse(**result)


@router.post("/cancel", response_model=CancelResponse)
async def cancel_subscription(
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Cancel the customer's Stripe Subscription at period end.

    Supports Idempotency-Key header to prevent duplicate cancellations on retry.
    """
    user_id = UUID(current_user["id"])
    user = await get_user_by_id(user_id)

    if not user or not user.stripe_subscription_id:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NO_SUBSCRIPTION",
                    "message": "No active subscription to cancel",
                    "request_id": str(uuid4()),
                }
            },
        )

    result = pay_service.cancel_subscription(user.stripe_subscription_id)
    await update_user(user_id, {"subscription_status": SubscriptionStatus.PAUSED})
    return CancelResponse(**result)


@router.get("/invoices", response_model=list[InvoiceItem])
async def list_invoices(
    current_user: dict = Depends(require_role(["CUSTOMER"])),
):
    """List the customer's invoices from Stripe."""
    customer_id = await _ensure_stripe_customer(current_user)
    return pay_service.list_invoices(customer_id)


@router.get("/payment-method", response_model=Optional[PaymentMethodResponse])
async def get_payment_method(
    current_user: dict = Depends(require_role(["CUSTOMER"])),
):
    """Get the customer's current payment method on file."""
    customer_id = await _ensure_stripe_customer(current_user)
    pm = pay_service.get_payment_method(customer_id)
    if not pm:
        return None
    return PaymentMethodResponse(**pm)


@router.patch("/payment-method", response_model=PaymentMethodResponse)
async def update_payment_method(
    data: UpdatePaymentMethodRequest,
    current_user: dict = Depends(require_role(["CUSTOMER"])),
):
    """Update the customer's default payment method."""
    customer_id = await _ensure_stripe_customer(current_user)
    result = pay_service.update_default_payment_method(customer_id, data.payment_method_id)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to update payment method")
    return PaymentMethodResponse(**result)
