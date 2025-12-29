"""
User model and role definitions for the Bloom platform.
"""

from enum import Enum
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID


class UserRole(str, Enum):
    """User roles in the Bloom platform."""
    CUSTOMER = "CUSTOMER"
    PROPERTY_MANAGER = "PROPERTY_MANAGER"
    FLORIST = "FLORIST"
    ADMIN = "ADMIN"


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
    property_id: Optional[UUID] = None  # Associated property (for residents)
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    created_at: datetime


class UserResponse(BaseModel):
    """User response model (excludes password)."""
    id: UUID
    email: EmailStr
    role: UserRole
    property_id: Optional[UUID] = None
    subscription_status: SubscriptionStatus = SubscriptionStatus.CREATED
    created_at: datetime
