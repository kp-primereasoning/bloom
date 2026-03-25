"""
Payment models for the Bloom platform.

Tracks payments, invoices, and florist payouts via Stripe.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, Integer, String, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PayoutStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Payment(Base):
    """Records individual payment events from Stripe."""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    stripe_payment_intent_id = Column(String(255), nullable=True, unique=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")
    status = Column(
        SQLEnum(PaymentStatus, name="paymentstatus"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    subscription_plan = Column(String(20), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, status={self.status.value}, amount={self.amount_cents})>"


class Invoice(Base):
    """Mirrors Stripe invoice records for local querying."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    stripe_invoice_id = Column(String(255), nullable=True, unique=True)
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")
    status = Column(String(50), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    pdf_url = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<Invoice(id={self.id}, stripe={self.stripe_invoice_id})>"


class FloristPayout(Base):
    """Tracks payouts to florists for fulfilled deliveries."""
    __tablename__ = "florist_payouts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    florist_id = Column(UUID(as_uuid=True), ForeignKey("florists.id"), nullable=False)
    stripe_transfer_id = Column(String(255), nullable=True, unique=True)
    amount_cents = Column(Integer, nullable=False)
    status = Column(
        SQLEnum(PayoutStatus, name="payoutstatus"),
        nullable=False,
        default=PayoutStatus.PENDING,
    )
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<FloristPayout(id={self.id}, florist={self.florist_id}, amount={self.amount_cents})>"
