"""
Florist availability model.

Tracks per-day-of-week availability and capacity limits for florists.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID

from db.database import Base


class FloristAvailability(Base):
    """
    Florist availability per day of week.

    day_of_week: 0=Monday, 1=Tuesday, ..., 6=Sunday
    max_deliveries_per_day: capacity cap for that day
    is_available: whether the florist accepts deliveries that day
    """
    __tablename__ = "florist_availability"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    florist_id = Column(UUID(as_uuid=True), ForeignKey("florists.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Mon, 6=Sun
    max_deliveries_per_day = Column(Integer, nullable=False, default=10)
    is_available = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
