"""
PropertyAssignment model for the Bloom platform.

A PropertyAssignment links a Florist to a Property for fulfillment.
Only one active assignment per property is allowed at any time.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class PropertyAssignment(Base):
    """
    PropertyAssignment ORM model.

    Represents the relationship between a Property and a Florist.
    A partial unique index ensures only one active assignment per property.
    """
    __tablename__ = "property_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("properties.id", ondelete="CASCADE"),
        nullable=False
    )
    florist_id = Column(
        UUID(as_uuid=True),
        ForeignKey("florists.id", ondelete="CASCADE"),
        nullable=False
    )
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    property = relationship("Property", back_populates="assignments")
    florist = relationship("Florist", back_populates="assignments")

    # Partial unique index: only one active assignment per property
    # This is enforced at the database level
    __table_args__ = (
        Index(
            "ix_property_assignments_one_active_per_property",
            "property_id",
            unique=True,
            postgresql_where=(active == True)
        ),
    )

    def __init__(self, **kwargs):
        # Set Python-level defaults before calling parent __init__
        if 'active' not in kwargs:
            kwargs['active'] = True
        if 'created_at' not in kwargs:
            kwargs['created_at'] = datetime.now(timezone.utc)
        super().__init__(**kwargs)

    def __repr__(self) -> str:
        return f"<PropertyAssignment(id={self.id}, property_id={self.property_id}, florist_id={self.florist_id}, active={self.active})>"
