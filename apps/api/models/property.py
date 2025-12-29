"""
Property model for the Bloom platform.

A Property represents a physical location (building/complex) that participates
in Bloom's floral subscription program.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class PropertyStatus(str, Enum):
    """Lifecycle state of a property."""
    DRAFT = "DRAFT"           # Initial state, property being set up
    SUBMITTED = "SUBMITTED"   # Pending review
    ACTIVE = "ACTIVE"         # Live and accepting subscriptions


class Property(Base):
    """
    Property ORM model.
    
    Represents a building or complex in the Bloom platform.
    Properties must have an active florist assignment before being activated.
    """
    __tablename__ = "properties"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    status = Column(
        SQLEnum(PropertyStatus, name="propertystatus"),
        nullable=False,
        default=PropertyStatus.DRAFT
    )
    delivery_cadence = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    # updated_at is managed at ORM layer via onupdate, not DB-level trigger
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    # Relationships
    assignments = relationship(
        "PropertyAssignment",
        back_populates="property",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Property(id={self.id}, name='{self.name}', status={self.status.value})>"
