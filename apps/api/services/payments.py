"""
Stripe payment service for the Bloom platform.

Handles subscription billing, payment methods, and florist payouts.
Stripe API key is loaded from AWS Secrets Manager (bloom/dev/stripe-api-key)
or from STRIPE_SECRET_KEY environment variable for local development.
"""

import os
import logging
from typing import Optional
from uuid import UUID

import stripe

logger = logging.getLogger(__name__)

# Price ID mapping: plan tier -> Stripe Price ID
# These must be created in the Stripe dashboard and configured here
PLAN_PRICE_IDS: dict[str, str] = {
    "ESSENTIAL": os.environ.get("STRIPE_PRICE_ESSENTIAL", ""),
    "SIGNATURE": os.environ.get("STRIPE_PRICE_SIGNATURE", ""),
    "STATEMENT": os.environ.get("STRIPE_PRICE_STATEMENT", ""),
}


def _get_stripe_key() -> str:
    """Get Stripe secret key from env or Secrets Manager."""
    key = os.environ.get("STRIPE_SECRET_KEY")
    if key:
        return key

    try:
        from services.aws.config import get_aws_settings
        settings = get_aws_settings()
        if settings.use_aws_secrets:
            from services.aws.secrets import get_secrets_client
            client = get_secrets_client(settings.aws_region)
            secret = client.get_secret("bloom/dev/stripe-api-key")
            if secret:
                return secret
    except Exception as e:
        logger.warning(f"Failed to get Stripe key from Secrets Manager: {e}")

    raise RuntimeError("STRIPE_SECRET_KEY not configured")


def get_stripe():
    """Initialize and return configured stripe module."""
    stripe.api_key = _get_stripe_key()
    return stripe


# ── Customer Management ──────────────────────────────────────────────

def create_customer(email: str, user_id: str) -> str:
    """Create a Stripe Customer and return the customer ID."""
    s = get_stripe()
    customer = s.Customer.create(
        email=email,
        metadata={"bloom_user_id": user_id},
    )
    logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
    return customer.id


def get_or_create_customer(email: str, user_id: str, stripe_customer_id: Optional[str] = None) -> str:
    """Get existing Stripe customer or create a new one."""
    if stripe_customer_id:
        return stripe_customer_id
    return create_customer(email, user_id)


# ── Setup Intent (card collection) ───────────────────────────────────

def create_setup_intent(stripe_customer_id: str) -> dict:
    """Create a SetupIntent for collecting a payment method."""
    s = get_stripe()
    intent = s.SetupIntent.create(
        customer=stripe_customer_id,
        payment_method_types=["card"],
    )
    return {
        "client_secret": intent.client_secret,
        "setup_intent_id": intent.id,
    }


# ── Subscription Management ──────────────────────────────────────────

def create_subscription(stripe_customer_id: str, plan: str) -> dict:
    """Create a Stripe Subscription for the given plan tier."""
    s = get_stripe()
    price_id = PLAN_PRICE_IDS.get(plan)
    if not price_id:
        raise ValueError(f"No Stripe Price ID configured for plan: {plan}")

    subscription = s.Subscription.create(
        customer=stripe_customer_id,
        items=[{"price": price_id}],
        off_session=True,
        payment_settings={"payment_method_types": ["card"]},
    )
    return {
        "subscription_id": subscription.id,
        "status": subscription.status,
        "client_secret": None,
    }


def cancel_subscription(stripe_subscription_id: str) -> dict:
    """Cancel a Stripe Subscription at period end."""
    s = get_stripe()
    subscription = s.Subscription.modify(
        stripe_subscription_id,
        cancel_at_period_end=True,
    )
    return {
        "subscription_id": subscription.id,
        "status": subscription.status,
        "cancel_at_period_end": subscription.cancel_at_period_end,
    }


# ── Payment Method ───────────────────────────────────────────────────

def get_payment_method(stripe_customer_id: str) -> Optional[dict]:
    """Get the customer's default payment method."""
    s = get_stripe()
    methods = s.PaymentMethod.list(customer=stripe_customer_id, type="card", limit=1)
    if not methods.data:
        return None
    pm = methods.data[0]
    return {
        "id": pm.id,
        "brand": pm.card.brand,
        "last4": pm.card.last4,
        "exp_month": pm.card.exp_month,
        "exp_year": pm.card.exp_year,
    }


def update_default_payment_method(stripe_customer_id: str, payment_method_id: str) -> dict:
    """Set a new default payment method for the customer."""
    s = get_stripe()
    # Attach the payment method to the customer
    s.PaymentMethod.attach(payment_method_id, customer=stripe_customer_id)
    # Set as default for invoices
    s.Customer.modify(
        stripe_customer_id,
        invoice_settings={"default_payment_method": payment_method_id},
    )
    return get_payment_method(stripe_customer_id)


# ── Invoices ─────────────────────────────────────────────────────────

def list_invoices(stripe_customer_id: str, limit: int = 20) -> list[dict]:
    """List customer invoices from Stripe."""
    s = get_stripe()
    invoices = s.Invoice.list(customer=stripe_customer_id, limit=limit)
    return [
        {
            "id": inv.id,
            "amount_cents": inv.amount_due,
            "currency": inv.currency,
            "status": inv.status,
            "period_start": inv.period_start,
            "period_end": inv.period_end,
            "pdf_url": inv.invoice_pdf,
            "created": inv.created,
        }
        for inv in invoices.data
    ]


# ── Webhook Signature Verification ──────────────────────────────────

def verify_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """Verify Stripe webhook signature and return the event."""
    s = get_stripe()
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        try:
            from services.aws.config import get_aws_settings
            settings = get_aws_settings()
            if settings.use_aws_secrets:
                from services.aws.secrets import get_secrets_client
                client = get_secrets_client(settings.aws_region)
                webhook_secret = client.get_secret("bloom/dev/stripe-webhook-secret") or ""
        except Exception:
            pass

    if not webhook_secret:
        raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")

    event = s.Webhook.construct_event(payload, sig_header, webhook_secret)
    return event
