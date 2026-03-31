"""
Waitlist model for tracking interest in unlisted buildings.

Users can submit waitlist entries for buildings not yet active on Bloom.
Admins can view and manage these entries to prioritize building activations.
"""

import uuid
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class WaitlistStatus(str, Enum):
    """Status of a waitlist entry."""
    PENDING = "PENDING"
    CONTACTED = "CONTACTED"
    ACTIVATED = "ACTIVATED"


class WaitlistEntry(Base):
    """Waitlist entry ORM model — persisted to PostgreSQL."""
    __tablename__ = "waitlist_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    building_name = Column(String(255), nullable=False)
    building_address = Column(String(500), nullable=False)
    status = Column(String(20), nullable=False, default=WaitlistStatus.PENDING.value)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<WaitlistEntry(id={self.id}, building='{self.building_name}', status={self.status})>"
