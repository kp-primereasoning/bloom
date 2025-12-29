"""
Admin routes - ADMIN role only.

Provides endpoints for managing properties, florists, and assignments.
"""

from uuid import UUID, uuid4
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth.dependencies import require_role
from db.database import get_db
from schemas.domain import (
    PropertyCreate,
    PropertyUpdate,
    PropertyResponse,
    FloristCreate,
    FloristResponse,
    PropertyAssignmentCreate,
    PropertyAssignmentResponse,
)
from services import property_service, florist_service, assignment_service


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/ping")
async def admin_ping(current_user: dict = Depends(require_role(["ADMIN"]))):
    """Test endpoint - ADMIN only."""
    return {"ok": True, "role": current_user["role"]}


# =============================================================================
# Property Endpoints
# =============================================================================

@router.post("/properties", response_model=PropertyResponse, status_code=201)
async def create_property(
    data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a new property (ADMIN only).
    
    Properties are always created in DRAFT status.
    """
    return property_service.create_property(db, data)


@router.get("/properties", response_model=List[PropertyResponse])
async def list_properties(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all properties (ADMIN only)."""
    return property_service.get_properties(db)


@router.patch("/properties/{property_id}", response_model=PropertyResponse)
async def update_property(
    property_id: UUID,
    data: PropertyUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Update a property (ADMIN only).
    
    Status transitions are validated:
    - DRAFT -> SUBMITTED: Always allowed
    - SUBMITTED -> ACTIVE: Only with active assignment
    - DRAFT -> ACTIVE: Not allowed
    """
    request_id = str(uuid4())
    return property_service.update_property(db, property_id, data, request_id)


# =============================================================================
# Florist Endpoints
# =============================================================================

@router.post("/florists", response_model=FloristResponse, status_code=201)
async def create_florist(
    data: FloristCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a new florist (ADMIN only).
    
    Florists are always created in ONBOARDING status.
    """
    return florist_service.create_florist(db, data)


@router.get("/florists", response_model=List[FloristResponse])
async def list_florists(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all florists (ADMIN only)."""
    return florist_service.get_florists(db)


# =============================================================================
# Assignment Endpoints
# =============================================================================

@router.post("/property-assignments", response_model=PropertyAssignmentResponse, status_code=201)
async def create_assignment(
    data: PropertyAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """
    Create a property-florist assignment (ADMIN only).
    
    If the property already has an active assignment, it will be deactivated.
    """
    request_id = str(uuid4())
    return assignment_service.create_assignment(db, data, request_id)


@router.get("/property-assignments", response_model=List[PropertyAssignmentResponse])
async def list_assignments(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    """List all property assignments (ADMIN only)."""
    return assignment_service.get_assignments(db)
