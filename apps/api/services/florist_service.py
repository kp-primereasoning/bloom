"""
Florist service - business logic for florist management.

Handles florist CRUD operations.
"""

from uuid import UUID
from typing import List, Optional

from sqlalchemy.orm import Session

from models.florist import Florist, FloristStatus
from schemas.domain import FloristCreate


def create_florist(db: Session, data: FloristCreate) -> Florist:
    """
    Create a new florist in ONBOARDING status.
    
    Florists are always created in ONBOARDING status regardless of input.
    """
    florist = Florist(
        name=data.name,
        status=FloristStatus.ONBOARDING  # Always ONBOARDING on creation
    )
    db.add(florist)
    db.commit()
    db.refresh(florist)
    return florist


def get_florists(db: Session, include_archived: bool = False) -> List[Florist]:
    """Get all florists, excluding ARCHIVED by default."""
    query = db.query(Florist)
    if not include_archived:
        query = query.filter(Florist.status != FloristStatus.ARCHIVED)
    return query.all()


def get_florist(db: Session, florist_id: UUID) -> Optional[Florist]:
    """Get a florist by ID."""
    return db.query(Florist).filter(Florist.id == florist_id).first()


def archive_florist(db: Session, florist_id: UUID, request_id: str) -> Florist:
    """
    Soft delete a florist by setting status to ARCHIVED.
    
    Args:
        db: Database session
        florist_id: ID of florist to archive
        request_id: Request ID for error tracking
        
    Returns:
        Archived florist
        
    Raises:
        HTTPException: If florist not found
    """
    from fastapi import HTTPException
    
    florist = get_florist(db, florist_id)
    if not florist:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "Florist not found",
                    "request_id": request_id
                }
            }
        )
    
    florist.status = FloristStatus.ARCHIVED
    db.commit()
    db.refresh(florist)
    return florist
