"""
Property service - business logic for property management.

Handles property CRUD operations and status transition validation.
"""

from uuid import UUID
from typing import List, Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

from models.property import Property, PropertyStatus
from models.property_assignment import PropertyAssignment
from schemas.domain import PropertyCreate, PropertyUpdate


# Valid status transitions
# DRAFT -> SUBMITTED: Always allowed
# SUBMITTED -> ACTIVE: Only with active assignment
# DRAFT -> ACTIVE: Never allowed (must go through SUBMITTED)
VALID_TRANSITIONS = {
    PropertyStatus.DRAFT: [PropertyStatus.SUBMITTED],
    PropertyStatus.SUBMITTED: [PropertyStatus.ACTIVE],
    PropertyStatus.ACTIVE: [],  # No transitions from ACTIVE in MLP
}


def create_property(db: Session, data: PropertyCreate) -> Property:
    """
    Create a new property in DRAFT status.
    
    Properties are always created in DRAFT status regardless of input.
    """
    prop = Property(
        name=data.name,
        address=data.address,
        delivery_cadence=data.delivery_cadence,
        status=PropertyStatus.DRAFT  # Always DRAFT on creation
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def get_properties(db: Session) -> List[Property]:
    """Get all properties."""
    return db.query(Property).all()


def get_property(db: Session, property_id: UUID) -> Optional[Property]:
    """Get a property by ID."""
    return db.query(Property).filter(Property.id == property_id).first()


def update_property(
    db: Session,
    property_id: UUID,
    data: PropertyUpdate,
    request_id: str
) -> Property:
    """
    Update a property with status transition validation.
    
    Status transitions are validated according to business rules:
    - DRAFT -> SUBMITTED: Always allowed
    - SUBMITTED -> ACTIVE: Only with active assignment
    - DRAFT -> ACTIVE: Never allowed
    """
    prop = get_property(db, property_id)
    if not prop:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Property not found",
                    "request_id": request_id
                }
            }
        )
    
    # Handle status transition if requested
    if data.status is not None and data.status != prop.status:
        _validate_status_transition(db, prop, data.status, request_id)
        prop.status = data.status
    
    # Update other fields if provided
    if data.name is not None:
        prop.name = data.name
    if data.address is not None:
        prop.address = data.address
    if data.delivery_cadence is not None:
        prop.delivery_cadence = data.delivery_cadence
    
    db.commit()
    db.refresh(prop)
    return prop


def _validate_status_transition(
    db: Session,
    prop: Property,
    new_status: PropertyStatus,
    request_id: str
) -> None:
    """
    Validate property status transition rules.
    
    Raises HTTPException if transition is invalid.
    """
    allowed = VALID_TRANSITIONS.get(prop.status, [])
    
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "BUSINESS_RULE_VIOLATION",
                    "message": f"Invalid status transition from {prop.status.value} to {new_status.value}",
                    "request_id": request_id
                }
            }
        )
    
    # SUBMITTED -> ACTIVE requires active assignment
    if new_status == PropertyStatus.ACTIVE:
        has_active = db.query(PropertyAssignment).filter(
            PropertyAssignment.property_id == prop.id,
            PropertyAssignment.active == True
        ).first()
        
        if not has_active:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": {
                        "code": "BUSINESS_RULE_VIOLATION",
                        "message": "Cannot activate property without an active florist assignment",
                        "request_id": request_id
                    }
                }
            )
