"""
PMPreference model for the Bloom platform.

Stores notification preferences for property managers,
allowing them to control which notifications they receive.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class PMPreference(Base):
    """
    PMPreference ORM model.

    Stores notification preference toggles for a property manager.
    One record per user (unique constraint on user_id).
    """
    __tablename__ = "pm_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, unique=True)
    delivery_reminders = Column(Boolean, nullable=False, default=True)
    participation_updates = Column(Boolean, nullable=False, default=True)
    rewards_milestones = Column(Boolean, nullable=False, default=True)
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
        return f"<PMPreference(id={self.id}, user_id={self.user_id})>"
