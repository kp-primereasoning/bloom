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
from models.delivery import SubscriptionPlan


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
# Registration Schemas (Public)
# =============================================================================

class RegisterRequest(BaseModel):
    """Schema for customer self-registration."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 characters)")


class RegisterResponse(BaseModel):
    """Schema for registration response (same as login)."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponseWithOnboarding"


class UserResponseWithOnboarding(BaseModel):
    """User response with onboarding fields for registration/login."""
    id: UUID
    email: EmailStr
    role: UserRole
    property_id: Optional[UUID] = None
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plan: Optional[SubscriptionPlan] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MeResponseWithPropertyName(BaseModel):
    """
    User response with property details for customer dashboard.

    Includes property_name and property_address resolved from property_id for display.
    """
    id: UUID
    email: EmailStr
    role: UserRole
    property_id: Optional[UUID] = None
    property_name: Optional[str] = Field(default=None, description="Resolved property name")
    property_address: Optional[str] = Field(default=None, description="Resolved property address")
    unit: Optional[str] = Field(default=None, description="User's unit number within the property")
    subscription_status: Optional[SubscriptionStatus] = None
    subscription_plan: Optional[SubscriptionPlan] = None
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


# =============================================================================
# Delivery Schemas
# =============================================================================

from models.delivery import SubscriptionPlan as SubscriptionPlanEnum, DeliveryStatus


class DeliveryResponse(BaseModel):
    """Schema for delivery API responses."""
    id: UUID
    user_id: UUID
    property_id: UUID
    subscription_plan: SubscriptionPlanEnum
    status: DeliveryStatus
    scheduled_for: datetime
    delivered_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class MeDeliveriesResponse(BaseModel):
    """
    Response for GET /me/deliveries endpoint.
    
    Contains the customer's next scheduled delivery (if any)
    and their delivery history (up to 20 most recent).
    """
    next_delivery: Optional[DeliveryResponse] = Field(
        default=None,
        description="Next scheduled delivery (future, not archived)"
    )
    history: list[DeliveryResponse] = Field(
        default_factory=list,
        description="Past deliveries, most recent first (limit 20)"
    )


# =============================================================================
# Florist Dashboard Schemas
# =============================================================================

from typing import Literal


class AssignedPropertyResponse(BaseModel):
    """Property info for florist's assigned properties list."""
    property_id: UUID
    property_name: str
    property_address: str


class FloristMeResponse(BaseModel):
    """
    Response for GET /florist/me endpoint.
    
    Returns florist profile with assigned properties.
    """
    florist_id: UUID
    florist_name: str
    florist_status: FloristStatus
    assigned_properties: list[AssignedPropertyResponse] = Field(
        default_factory=list,
        description="List of properties assigned to this florist"
    )


class FloristDeliveryResponse(BaseModel):
    """
    Delivery info for florist deliveries list.
    
    Includes customer and property details for display.
    """
    id: UUID
    customer_email: str
    property_id: UUID
    property_name: str
    property_address: str
    subscription_plan: SubscriptionPlanEnum
    status: DeliveryStatus
    scheduled_for: datetime


class FloristDeliveriesListResponse(BaseModel):
    """
    Response for GET /florist/deliveries endpoint.
    
    Returns list of upcoming deliveries for assigned properties.
    """
    deliveries: list[FloristDeliveryResponse] = Field(
        default_factory=list,
        description="List of scheduled deliveries for assigned properties"
    )


class UpdateDeliveryStatusRequest(BaseModel):
    """
    Request body for PATCH /florist/deliveries/{delivery_id}.
    
    Only DELIVERED or MISSED status allowed (florist actions).
    """
    status: Literal["DELIVERED", "MISSED"] = Field(
        ...,
        description="New delivery status (DELIVERED or MISSED only)"
    )
