"""
Florist model for the Bloom platform.

A Florist represents a flower vendor connected to the Bloom platform
who fulfills deliveries for assigned properties.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class FloristStatus(str, Enum):
    """Lifecycle state of a florist."""
    ONBOARDING = "ONBOARDING"  # Setup in progress
    READY = "READY"            # Can accept assignments
    ARCHIVED = "ARCHIVED"      # Soft deleted


class Florist(Base):
    """
    Florist ORM model.

    Represents a flower vendor in the Bloom platform.
    Florists connect their Shopify store and fulfill deliveries.
    """
    __tablename__ = "florists"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    status = Column(
        SQLEnum(FloristStatus, name="floriststatus"),
        nullable=False,
        default=FloristStatus.ONBOARDING
    )
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    assignments = relationship(
        "PropertyAssignment",
        back_populates="florist",
        cascade="all, delete-orphan"
    )

    def __init__(self, **kwargs):
        # Set Python-level defaults before calling parent __init__
        if 'status' not in kwargs:
            kwargs['status'] = FloristStatus.ONBOARDING
        if 'created_at' not in kwargs:
            kwargs['created_at'] = datetime.now(timezone.utc)
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<Florist(id={self.id}, name='{self.name}', status={self.status.value})>"
