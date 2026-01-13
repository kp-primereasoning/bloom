"""
Public properties routes - no authentication required.

Provides endpoints for listing properties available for customer selection.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from services import property_service
from models.property import PropertyStatus


router = APIRouter(prefix="/properties", tags=["properties"])


class PropertyListItem(BaseModel):
    """Minimal property info for public listing."""
    id: UUID
    name: str
    address: str
    
    model_config = {"from_attributes": True}


@router.get("", response_model=List[PropertyListItem])
async def list_properties_public(db: Session = Depends(get_db)):
    """
    List all available properties for customer selection.
    
    Public endpoint - no authentication required.
    Returns minimal property info (id, name, address).
    Excludes ARCHIVED properties.
    """
    properties = property_service.get_properties(db, include_archived=False)
    
    # Filter out ARCHIVED (already done by service) and return minimal fields
    return [
        PropertyListItem(
            id=prop.id,
            name=prop.name,
            address=prop.address
        )
        for prop in properties
        if prop.status != PropertyStatus.ARCHIVED
    ]
