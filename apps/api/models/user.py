"""
User model for the Bloom platform.

Users are stored in PostgreSQL. This replaces the previous in-memory store.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base
from models.delivery import SubscriptionPlan


class UserRole(str, Enum):
    """User roles in the Bloom platform."""
    CUSTOMER = "CUSTOMER"
    PROPERTY_MANAGER = "PROPERTY_MANAGER"
    FLORIST = "FLORIST"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    """User account status for soft delete support."""
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class SubscriptionStatus(str, Enum):
    """User subscription lifecycle status."""
    CREATED = "CREATED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"


class User(Base):
    """User ORM model — persisted to PostgreSQL."""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="userrole"), nullable=False)
    status = Column(
        SQLEnum(UserStatus, name="userstatus"),
        nullable=False,
        default=UserStatus.ACTIVE,
    )
    # Property association (CUSTOMER and PROPERTY_MANAGER)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    unit = Column(String(50), nullable=True)
    # Subscription (CUSTOMER only)
    subscription_status = Column(
        SQLEnum(SubscriptionStatus, name="subscriptionstatus"),
        nullable=True,
        default=SubscriptionStatus.CREATED,
    )
    subscription_plan = Column(
        SQLEnum(SubscriptionPlan, name="subscriptionplan_user"),
        nullable=True,
    )
    # Florist link (FLORIST role only)
    florist_id = Column(UUID(as_uuid=True), ForeignKey("florists.id", ondelete="SET NULL"), nullable=True)
    # Stripe billing
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    # Delivery preferences
    skip_next_delivery = Column(Boolean, nullable=False, default=False)
    email_notifications_enabled = Column(Boolean, nullable=False, default=True)
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __init__(self, **kwargs):
        if "status" not in kwargs:
            kwargs["status"] = UserStatus.ACTIVE
        if "subscription_status" not in kwargs and kwargs.get("role") == UserRole.CUSTOMER:
            kwargs["subscription_status"] = SubscriptionStatus.CREATED
        now = datetime.now(timezone.utc)
        if "created_at" not in kwargs:
            kwargs["created_at"] = now
        if "updated_at" not in kwargs:
            kwargs["updated_at"] = now
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role={self.role.value})>"


class UserResponse(BaseModel):
    """User response model (excludes password)."""
    id: uuid.UUID
    email: EmailStr
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    property_id: Optional[uuid.UUID] = None
    unit: Optional[str] = None
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plan: Optional[SubscriptionPlan] = None
    created_at: datetime

    class Config:
        from_attributes = True
