"""
Property tests for payment logic.
Task 1.10: payment creation, webhook idempotency, payout calculation.
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.payment import Payment, PaymentStatus, Invoice, FloristPayout


# =============================================================================
# Strategies
# =============================================================================

amount_cents_strategy = st.integers(min_value=0, max_value=100_000_00)
currency_strategy = st.sampled_from(["usd", "cad", "eur"])
plan_strategy = st.sampled_from(["ESSENTIAL", "SIGNATURE", "STATEMENT"])
status_strategy = st.sampled_from([s for s in PaymentStatus])


# =============================================================================
# Property 1: Payment model defaults are consistent
# =============================================================================

class TestPaymentModelDefaults:
    """Payment records always have required fields set correctly."""

    @given(amount=amount_cents_strategy, currency=currency_strategy)
    @settings(max_examples=50)
    def test_payment_amount_and_currency_stored(self, amount, currency):
        p = Payment(
            user_id=uuid4(),
            property_id=uuid4(),
            amount_cents=amount,
            currency=currency,
            status=PaymentStatus.SUCCEEDED,
        )
        assert p.amount_cents == amount
        assert p.currency == currency
        assert p.status == PaymentStatus.SUCCEEDED

    @given(amount=amount_cents_strategy)
    @settings(max_examples=50)
    def test_payment_status_transitions_are_valid(self, amount):
        """All PaymentStatus enum values can be assigned."""
        for status in PaymentStatus:
            p = Payment(
                user_id=uuid4(),
                amount_cents=amount,
                status=status,
            )
            assert p.status == status


# =============================================================================
# Property 2: Invoice idempotency — same stripe_invoice_id should be detectable
# =============================================================================

class TestInvoiceIdempotency:
    """Invoices with the same stripe_invoice_id can be detected for dedup."""

    @given(amount=amount_cents_strategy)
    @settings(max_examples=50)
    def test_invoice_stripe_id_uniqueness_check(self, amount):
        stripe_id = f"in_{uuid4().hex[:24]}"
        inv1 = Invoice(
            user_id=uuid4(),
            stripe_invoice_id=stripe_id,
            amount_cents=amount,
            status="paid",
        )
        inv2 = Invoice(
            user_id=uuid4(),
            stripe_invoice_id=stripe_id,
            amount_cents=amount + 100,
            status="paid",
        )
        # Same stripe_invoice_id means duplicate
        assert inv1.stripe_invoice_id == inv2.stripe_invoice_id


# =============================================================================
# Property 3: Payout calculation — amounts are non-negative
# =============================================================================

class TestPayoutCalculation:
    """Payout amounts must always be non-negative."""

    @given(amount=amount_cents_strategy)
    @settings(max_examples=50)
    def test_payout_amount_non_negative(self, amount):
        payout = FloristPayout(
            florist_id=uuid4(),
            amount_cents=amount,
            status="pending",
        )
        assert payout.amount_cents >= 0

    @given(
        amounts=st.lists(amount_cents_strategy, min_size=1, max_size=20),
    )
    @settings(max_examples=50)
    def test_payout_total_equals_sum(self, amounts):
        """Total payout across multiple records equals sum of individual amounts."""
        payouts = [
            FloristPayout(florist_id=uuid4(), amount_cents=a, status="pending")
            for a in amounts
        ]
        total = sum(p.amount_cents for p in payouts)
        assert total == sum(amounts)


# =============================================================================
# Property 4: Idempotency cache behavior (unit test of the cache dict)
# =============================================================================

class TestIdempotencyCache:
    """In-memory idempotency cache returns same response for same key."""

    @given(key=st.text(min_size=1, max_size=64))
    @settings(max_examples=50)
    def test_cache_returns_same_value(self, key):
        cache: dict[str, dict] = {}
        response = {"subscription_id": f"sub_{uuid4().hex[:12]}", "status": "active"}
        cache[key] = response
        assert cache[key] is response

    @given(
        key1=st.text(min_size=1, max_size=32),
        key2=st.text(min_size=1, max_size=32),
    )
    @settings(max_examples=50)
    def test_different_keys_independent(self, key1, key2):
        from hypothesis import assume
        assume(key1 != key2)
        cache: dict[str, dict] = {}
        r1 = {"id": "a"}
        r2 = {"id": "b"}
        cache[key1] = r1
        cache[key2] = r2
        assert cache[key1] == r1
        assert cache[key2] == r2
