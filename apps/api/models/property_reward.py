"""
PropertyReward model for the Bloom platform.

Persists the computed reward tier and participation rate snapshot
for a property, enabling consistent and auditable tier status.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class PropertyReward(Base):
    """
    PropertyReward ORM model.

    Stores the current reward tier (Bronze/Silver/Gold) and participation
    rate for a property. One record per property (unique constraint).
    """
    __tablename__ = "property_rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    property_id = Column(
        UUID(as_uuid=True),
        ForeignKey("properties.id"),
        nullable=False,
        unique=True,
    )
    tier = Column(String(10), nullable=False, default="Bronze")
    participation_rate = Column(Numeric(5, 2), nullable=False, default=0.0)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def __repr__(self) -> str:
        return f"<PropertyReward(id={self.id}, property_id={self.property_id}, tier='{self.tier}')>"
