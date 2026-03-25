"""
User model and role definitions for the Bloom platform.
"""

from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID

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
    CREATED = "CREATED"   # Account created, no subscription set up
    ACTIVE = "ACTIVE"     # Active subscription
    PAUSED = "PAUSED"     # Subscription paused


class User(BaseModel):
    """Internal user model with password hash."""
    id: UUID
    email: EmailStr
    hashed_password: str
    role: UserRole
    status: UserStatus = UserStatus.ACTIVE  # For soft delete
    property_id: Optional[UUID] = None  # Associated property (for residents)
    unit: Optional[str] = None  # Unit number within the property
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    subscription_plan: Optional[SubscriptionPlan] = None  # Selected plan tier
    florist_id: Optional[UUID] = None  # Associated florist (for FLORIST role users)
    stripe_customer_id: Optional[str] = None  # Stripe Customer ID
    stripe_subscription_id: Optional[str] = None  # Stripe Subscription ID
    skip_next_delivery: bool = False  # Customer wants to skip next delivery cycle
    email_notifications_enabled: bool = True  # Whether to send email notifications
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
