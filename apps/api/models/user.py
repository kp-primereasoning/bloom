"""
User model and role definitions for the Bloom platform.
"""

import uuid
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID

from sqlalchemy import Column, String, Boolean, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID

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


class UserDB(Base):
    """SQLAlchemy ORM model for the users table."""
    __tablename__ = "users"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="userrole"), nullable=False)
    status = Column(SQLEnum(UserStatus, name="userstatus"), nullable=False, default=UserStatus.ACTIVE)
    property_id = Column(PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), nullable=True)
    unit = Column(String(50), nullable=True)
    subscription_status = Column(SQLEnum(SubscriptionStatus, name="subscriptionstatus"), nullable=False, default=SubscriptionStatus.CREATED)
    subscription_plan = Column(SQLEnum(SubscriptionPlan, name="subscriptionplan"), nullable=True)
    florist_id = Column(PGUUID(as_uuid=True), ForeignKey("florists.id", ondelete="SET NULL"), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    skip_next_delivery = Column(Boolean, nullable=False, default=False)
    email_notifications_enabled = Column(Boolean, nullable=False, default=True)
    cognito_sub = Column(String(255), nullable=True, unique=True)  # AWS Cognito user sub
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def to_pydantic(self) -> "User":
        return User(
            id=self.id,
            email=self.email,
            hashed_password=self.hashed_password,
            role=self.role,
            status=self.status,
            property_id=self.property_id,
            unit=self.unit,
            subscription_status=self.subscription_status or SubscriptionStatus.CREATED,
            subscription_plan=self.subscription_plan,
            florist_id=self.florist_id,
            stripe_customer_id=self.stripe_customer_id,
            stripe_subscription_id=self.stripe_subscription_id,
            skip_next_delivery=self.skip_next_delivery or False,
            email_notifications_enabled=self.email_notifications_enabled if self.email_notifications_enabled is not None else True,
            created_at=self.created_at,
        )


class User(BaseModel):
    """Internal user model with password hash."""
    id: UUID
    email: EmailStr
    hashed_password: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    property_id: Optional[UUID] = None
    unit: Optional[str] = None
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    subscription_plan: Optional[SubscriptionPlan] = None
    florist_id: Optional[UUID] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    skip_next_delivery: bool = False
    email_notifications_enabled: bool = True
    created_at: datetime


class UserResponse(BaseModel):
    """User response model (excludes password)."""
    id: UUID
    email: EmailStr
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE
    property_id: Optional[UUID] = None
    unit: Optional[str] = None
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    subscription_plan: Optional[SubscriptionPlan] = None
    created_at: datetime
