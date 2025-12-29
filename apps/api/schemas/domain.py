"""
Pydantic schemas for domain entities.

These schemas define the request/response formats for the admin API endpoints.
"""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, Field

from models.property import PropertyStatus
from models.florist import FloristStatus


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
