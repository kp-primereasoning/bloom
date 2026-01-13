"""
Property model for the Bloom platform.

A Property represents a physical location (building/complex) that participates
in Bloom's floral subscription program.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class PropertyStatus(str, Enum):
    """
    Property lifecycle status - computed based on assignments.

    Status transitions are automatic based on florist and PM assignments:
    - CREATED: No florist, no PM assigned
    - PENDING_FLORIST: Has PM, needs florist
    - PENDING_PM: Has florist, needs PM
    - ACTIVE: Has both florist and PM assigned
    - ARCHIVED: Soft deleted
    """
    CREATED = "CREATED"
    PENDING_FLORIST = "PENDING_FLORIST"
    PENDING_PM = "PENDING_PM"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class Property(Base):
    """
    Property ORM model.

    Represents a building or complex in the Bloom platform.
    Properties must have both a florist assignment and property manager
    before being activated.
    """
    __tablename__ = "properties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    status = Column(
        SQLEnum(PropertyStatus, name="propertystatus_v2"),
        nullable=False,
        default=PropertyStatus.CREATED
    )
    delivery_cadence = Column(String(100), nullable=True)
    # Property manager assignment (references in-memory user store by ID)
    property_manager_id = Column(UUID(as_uuid=True), nullable=True)
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

    def __init__(self, **kwargs):
        # Set Python-level defaults before calling parent __init__
        if 'status' not in kwargs:
            kwargs['status'] = PropertyStatus.CREATED
        now = datetime.now(timezone.utc)
        if 'created_at' not in kwargs:
            kwargs['created_at'] = now
        if 'updated_at' not in kwargs:
            kwargs['updated_at'] = now
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<Property(id={self.id}, name='{self.name}', status={self.status.value})>"
