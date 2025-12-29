"""
Pydantic schemas for domain entities.

These schemas define the request/response formats for the admin API endpoints.
"""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from models.property import PropertyStatus
from models.florist import FloristStatus
from models.user import UserRole, SubscriptionStatus


# =============================================================================
# Property Schemas
# =============================================================================

class PropertyCreate(BaseModel):
    """Schema for creating a new property."""
    name: str = Field(..., min_length=1, max_length=255, description="Property name")
    address: str = Field(..., min_length=1, max_length=500, description="Property address")
    delivery_cadence: Optional[str] = Field(
        None,
        max_length=100,
        description="Delivery schedule (e.g., 'weekly', 'bi-weekly')"
    )


class PropertyUpdate(BaseModel):
    """Schema for updating an existing property."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    address: Optional[str] = Field(None, min_length=1, max_length=500)
    status: Optional[PropertyStatus] = Field(None, description="New status for the property")
    delivery_cadence: Optional[str] = Field(None, max_length=100)


class PropertyResponse(BaseModel):
    """Schema for property API responses."""
    id: UUID
    name: str
    address: str
    status: PropertyStatus
    delivery_cadence: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class EnrichedPropertyResponse(BaseModel):
    """
    Enhanced property response with computed fields.
    
    Includes user counts, florist name, and property manager email
    for the admin properties table.
    """
    id: UUID
    name: str
    address: str
    status: PropertyStatus
    delivery_cadence: Optional[str]
    total_users: int = Field(default=0, description="Count of all users associated with this property")
    active_users: int = Field(default=0, description="Count of users with ACTIVE subscription status")
    florist_name: Optional[str] = Field(default=None, description="Name of assigned florist")
    property_manager_email: Optional[str] = Field(default=None, description="Email of assigned property manager")
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class AssignPMRequest(BaseModel):
    """Schema for assigning a property manager to a property."""
    user_id: UUID = Field(..., description="ID of the user to assign as property manager")


# =============================================================================
# Florist Schemas
# =============================================================================

class FloristCreate(BaseModel):
    """Schema for creating a new florist."""
    name: str = Field(..., min_length=1, max_length=255, description="Florist business name")


class FloristResponse(BaseModel):
    """Schema for florist API responses."""
    id: UUID
    name: str
    status: FloristStatus
    created_at: datetime
    
    model_config = {"from_attributes": True}


# =============================================================================
# PropertyAssignment Schemas
# =============================================================================

class PropertyAssignmentCreate(BaseModel):
    """Schema for creating a new property-florist assignment."""
    property_id: UUID = Field(..., description="ID of the property to assign")
    florist_id: UUID = Field(..., description="ID of the florist to assign")


class PropertyAssignmentResponse(BaseModel):
    """Schema for property assignment API responses."""
    id: UUID
    property_id: UUID
    florist_id: UUID
    active: bool
    created_at: datetime
    
    model_config = {"from_attributes": True}


# =============================================================================
# User Schemas
# =============================================================================

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr = Field(..., description="User email address")
    role: UserRole = Field(..., description="User role")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")
    property_id: Optional[UUID] = Field(
        None,
        description="Property ID (only valid for PROPERTY_MANAGER role)"
    )


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""
    role: Optional[UserRole] = Field(None, description="New role for the user")
    property_id: Optional[UUID] = Field(
        None,
        description="Property ID (only valid for PROPERTY_MANAGER role)"
    )
    subscription_status: Optional[SubscriptionStatus] = Field(
        None,
        description="Subscription status (only valid for CUSTOMER role)"
    )


class EnrichedUserResponse(BaseModel):
    """
    Enhanced user response with resolved property name.
    
    Includes property_name resolved from property_id for display in admin table.
    subscription_status is null for non-CUSTOMER users.
    """
    id: UUID
    email: EmailStr
    role: UserRole
    property_id: Optional[UUID] = None
    property_name: Optional[str] = Field(default=None, description="Resolved property name")
    subscription_status: Optional[SubscriptionStatus] = Field(
        default=None,
        description="Subscription status (null for non-CUSTOMER users)"
    )
    created_at: datetime
    
    model_config = {"from_attributes": True}
