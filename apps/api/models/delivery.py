"""
Delivery model for the Bloom platform.

A Delivery represents a scheduled or completed floral delivery to a customer's property.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class SubscriptionPlan(str, Enum):
    """
    Subscription plan tiers.
    
    Represents the customer's selected plan level:
    - ESSENTIAL: Basic floral arrangement
    - SIGNATURE: Premium floral arrangement
    - STATEMENT: Luxury floral arrangement
    """
    ESSENTIAL = "ESSENTIAL"
    SIGNATURE = "SIGNATURE"
    STATEMENT = "STATEMENT"


class DeliveryStatus(str, Enum):
    """
    Delivery lifecycle status.
    
    Status transitions:
    - SCHEDULED: Delivery is planned for a future date
    - DELIVERED: Delivery was successfully completed
    - SKIPPED: Customer chose to skip this delivery
    - MISSED: Delivery was not completed (e.g., no access)
    """
    SCHEDULED = "SCHEDULED"
    DELIVERED = "DELIVERED"
    SKIPPED = "SKIPPED"
    MISSED = "MISSED"


class Delivery(Base):
    """
    Delivery ORM model.
    
    Represents a floral delivery to a customer's property.
    Tracks scheduled and completed deliveries with soft delete support.
    """
    __tablename__ = "deliveries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # References in-memory user store
    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("properties.id"),
        nullable=False
    )
    subscription_plan = Column(
        SQLEnum(SubscriptionPlan, name="subscriptionplan"),
        nullable=False
    )
    status = Column(
        SQLEnum(DeliveryStatus, name="deliverystatus"),
        nullable=False,
        default=DeliveryStatus.SCHEDULED
    )
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    archived_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    property = relationship("Property", backref="deliveries")
    
    def __repr__(self) -> str:
        return f"<Delivery(id={self.id}, user_id={self.user_id}, status={self.status.value})>"
