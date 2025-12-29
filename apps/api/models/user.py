"""
User model and role definitions for the Bloom platform.
"""

from enum import Enum
from datetime import datetime
from pydantic import BaseModel, EmailStr
from uuid import UUID


class UserRole(str, Enum):
    """User roles in the Bloom platform."""
    CUSTOMER = "CUSTOMER"
    PROPERTY_MANAGER = "PROPERTY_MANAGER"
    FLORIST = "FLORIST"
    ADMIN = "ADMIN"


class User(BaseModel):
    """Internal user model with password hash."""
    id: UUID
    email: EmailStr
    hashed_password: str
    role: UserRole
    created_at: datetime


class UserResponse(BaseModel):
    """User response model (excludes password)."""
    id: UUID
    email: EmailStr
    role: UserRole
    created_at: datetime
