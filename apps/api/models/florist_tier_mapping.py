"""
FloristTierMapping model — maps a Bloom subscription tier to a Shopify product.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class FloristTierMapping(Base):
    """Maps a subscription tier (ESSENTIAL/SIGNATURE/STATEMENT) to a Shopify product."""
    __tablename__ = "florist_tier_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("florist_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    tier = Column(String(20), nullable=False)  # ESSENTIAL | SIGNATURE | STATEMENT
    shopify_product_id = Column(String(64), nullable=False)
    product_title = Column(String(500), nullable=False)
    product_price = Column(String(20), nullable=False, default="0.00")
    mapped_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    connection = relationship("FloristConnection", back_populates="tier_mappings")

    # One mapping per tier per connection
    __table_args__ = (
        UniqueConstraint("connection_id", "tier", name="uq_connection_tier"),
    )

    def __repr__(self) -> str:
        return f"<FloristTierMapping(tier={self.tier}, product={self.shopify_product_id})>"
