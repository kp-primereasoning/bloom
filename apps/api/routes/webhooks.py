"""
Webhook routes — Stripe event processing.

POST /webhooks/stripe — receives Stripe webhook events.

Handled events:
- invoice.payment_succeeded — record payment, confirm delivery
- invoice.payment_failed — mark payment failed, pause subscription
- customer.subscription.deleted — update subscription status to PAUSED
"""

import logging
import hashlib
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy.orm import Session

from db.database import SessionLocal
from db.users import get_all_users, update_user
from models.payment import Payment, PaymentStatus, Invoice
from models.user import SubscriptionStatus
from models.webhook_event import WebhookEvent
from services.payments import verify_webhook_signature

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


async def _find_user_by_stripe_customer(customer_id: str):
    """Find in-memory user by stripe_customer_id."""
    users = await get_all_users(include_archived=True)
    for u in users:
        if getattr(u, "stripe_customer_id", None) == customer_id:
            return u
    return None


@router.post("/stripe")
async def stripe_webhook(request: Request):
    """
    Process incoming Stripe webhook events.

    Verifies the webhook signature, then dispatches to the appropriate handler.
    Always returns 200 to acknowledge receipt (Stripe retries on non-2xx).
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = verify_webhook_signature(payload, sig_header)
    except Exception as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type", "") if isinstance(event, dict) else event.type
    event_id = event.get("id", "") if isinstance(event, dict) else getattr(event, "id", "")
    logger.info(f"Stripe webhook received: {event_type}")

    payload_hash = hashlib.sha256(payload).hexdigest()

    db = SessionLocal()
    # Log webhook event for audit trail
    wh_event = WebhookEvent(
        source="stripe",
        event_type=event_type,
        event_id=event_id,
        payload_hash=payload_hash,
        status="received",
    )
    try:
        db.add(wh_event)
        db.commit()
    except Exception:
        db.rollback()  # Non-fatal

    try:
        if event_type == "invoice.payment_succeeded":
            await _handle_payment_succeeded(event, db)
        elif event_type == "invoice.payment_failed":
            await _handle_payment_failed(event, db)
        elif event_type == "customer.subscription.deleted":
            await _handle_subscription_deleted(event, db)
        else:
            logger.info(f"Unhandled Stripe event type: {event_type}")

        # Mark as processed
        try:
            wh_event.status = "processed"
            db.commit()
        except Exception:
            db.rollback()
    except Exception as e:
        logger.error(f"Error processing webhook {event_type}: {e}")
        try:
            wh_event.status = "failed"
            wh_event.error_message = str(e)[:500]
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()

    return {"received": True}


async def _handle_payment_succeeded(event, db: Session):
    """Record successful payment and create local invoice record."""
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
    customer_id = data.get("customer") if isinstance(data, dict) else getattr(data, "customer", None)
    invoice_id = data.get("id") if isinstance(data, dict) else getattr(data, "id", None)
    amount = data.get("amount_paid", 0) if isinstance(data, dict) else getattr(data, "amount_paid", 0)

    user = await _find_user_by_stripe_customer(customer_id) if customer_id else None
    if not user:
        logger.warning(f"No user found for Stripe customer {customer_id}")
        return

    # Idempotency: skip if we already recorded this invoice
    existing = db.query(Invoice).filter(Invoice.stripe_invoice_id == invoice_id).first()
    if existing:
        logger.info(f"Invoice {invoice_id} already recorded, skipping")
        return

    # Record payment
    payment = Payment(
        user_id=user.id,
        property_id=user.property_id,
        stripe_payment_intent_id=data.get("payment_intent") if isinstance(data, dict) else getattr(data, "payment_intent", None),
        amount_cents=amount,
        currency=(data.get("currency", "usd") if isinstance(data, dict) else getattr(data, "currency", "usd")),
        status=PaymentStatus.SUCCEEDED,
        subscription_plan=user.subscription_plan.value if user.subscription_plan else None,
    )
    db.add(payment)

    # Record invoice
    period_start = data.get("period_start") if isinstance(data, dict) else getattr(data, "period_start", None)
    period_end = data.get("period_end") if isinstance(data, dict) else getattr(data, "period_end", None)
    invoice = Invoice(
        user_id=user.id,
        stripe_invoice_id=invoice_id,
        amount_cents=amount,
        currency=(data.get("currency", "usd") if isinstance(data, dict) else getattr(data, "currency", "usd")),
        status="paid",
        period_start=datetime.fromtimestamp(period_start, tz=timezone.utc) if period_start else None,
        period_end=datetime.fromtimestamp(period_end, tz=timezone.utc) if period_end else None,
        pdf_url=data.get("invoice_pdf") if isinstance(data, dict) else getattr(data, "invoice_pdf", None),
    )
    db.add(invoice)
    db.commit()
    logger.info(f"Recorded payment for user {user.id}, invoice {invoice_id}")

    # Send payment receipt email
    try:
        from services.email import send_payment_receipt
        amount_str = f"${amount / 100:.2f}"
        plan = user.subscription_plan.value if user.subscription_plan else None
        send_payment_receipt(user.email, amount_str, plan)
    except Exception:
        pass  # Non-fatal


async def _handle_payment_failed(event, db: Session):
    """Record failed payment and pause subscription."""
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
    customer_id = data.get("customer") if isinstance(data, dict) else getattr(data, "customer", None)
    amount = data.get("amount_due", 0) if isinstance(data, dict) else getattr(data, "amount_due", 0)

    user = await _find_user_by_stripe_customer(customer_id) if customer_id else None
    if not user:
        logger.warning(f"No user found for Stripe customer {customer_id}")
        return

    # Record failed payment
    payment = Payment(
        user_id=user.id,
        property_id=user.property_id,
        stripe_payment_intent_id=data.get("payment_intent") if isinstance(data, dict) else getattr(data, "payment_intent", None),
        amount_cents=amount,
        status=PaymentStatus.FAILED,
        subscription_plan=user.subscription_plan.value if user.subscription_plan else None,
    )
    db.add(payment)
    db.commit()

    # Pause subscription
    await update_user(user.id, {"subscription_status": SubscriptionStatus.PAUSED})
    logger.info(f"Payment failed for user {user.id}, subscription paused")

    # Record metric
    try:
        from services.metrics import record_payment_failed
        record_payment_failed()
    except Exception:
        pass

    # Send payment failed email
    try:
        from services.email import send_payment_failed
        send_payment_failed(user.email)
    except Exception:
        pass  # Non-fatal


async def _handle_subscription_deleted(event, db: Session):
    """Handle subscription cancellation from Stripe."""
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object
    customer_id = data.get("customer") if isinstance(data, dict) else getattr(data, "customer", None)

    user = await _find_user_by_stripe_customer(customer_id) if customer_id else None
    if not user:
        logger.warning(f"No user found for Stripe customer {customer_id}")
        return

    await update_user(user.id, {
        "subscription_status": SubscriptionStatus.PAUSED,
        "stripe_subscription_id": None,
    })
    logger.info(f"Subscription deleted for user {user.id}")
