"""
Assignment service - business logic for property-florist assignments.

Handles assignment creation with automatic deactivation of existing assignments
and property status recomputation.
"""

from uuid import UUID
from typing import List

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from models.property_assignment import PropertyAssignment
from models.property import Property
from models.florist import Florist
from schemas.domain import PropertyAssignmentCreate
from services.property_service import _recompute_property_status


def create_assignment(
    db: Session,
    data: PropertyAssignmentCreate,
    request_id: str
) -> PropertyAssignment:
    """
    Create a new property-florist assignment.
    
    If the property already has an active assignment, it will be deactivated
    before creating the new one. This ensures only one active assignment
    per property at any time.
    
    After creating the assignment, the property status is recomputed.
    """
    # Validate property exists
    prop = db.query(Property).filter(Property.id == data.property_id).first()
    if not prop:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Property not found",
                    "request_id": request_id
                }
            }
        )
    
    # Validate florist exists
    florist = db.query(Florist).filter(Florist.id == data.florist_id).first()
    if not florist:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Florist not found",
                    "request_id": request_id
                }
            }
        )
    
    # Deactivate existing active assignment for this property
    db.query(PropertyAssignment).filter(
        PropertyAssignment.property_id == data.property_id,
        PropertyAssignment.active == True
    ).update({"active": False})
    
    # Create new assignment
    assignment = PropertyAssignment(
        property_id=data.property_id,
        florist_id=data.florist_id,
        active=True  # Always active on creation
    )
    db.add(assignment)
    
    # Recompute property status after florist assignment
    _recompute_property_status(db, prop)
    
    try:
        db.commit()
        db.refresh(assignment)
        return assignment
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Failed to create assignment",
                    "request_id": request_id
                }
            }
        )


def get_assignments(db: Session) -> List[PropertyAssignment]:
    """Get all property assignments."""
    return db.query(PropertyAssignment).all()
