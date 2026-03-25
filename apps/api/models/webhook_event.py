"""
Webhook event log model.

Stores all incoming webhook events (Stripe, Shopify) for audit trail
and idempotency checking.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class WebhookEvent(Base):
    """Audit log for incoming webhook events."""
    __tablename__ = "webhook_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source = Column(String(50), nullable=False)  # "stripe" or "shopify"
    event_type = Column(String(100), nullable=False)
    event_id = Column(String(255), nullable=True)  # External event ID for dedup
    payload_hash = Column(String(64), nullable=True)  # SHA-256 of payload
    status = Column(String(20), nullable=False, default="received")  # received, processed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
