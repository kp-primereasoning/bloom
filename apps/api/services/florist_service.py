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


def get_florists(db: Session) -> List[Florist]:
    """Get all florists."""
    return db.query(Florist).all()


def get_florist(db: Session, florist_id: UUID) -> Optional[Florist]:
    """Get a florist by ID."""
    return db.query(Florist).filter(Florist.id == florist_id).first()
