"""
Florist connection and product models for Shopify integration.

These models store the data synced from florist Shopify stores:
- FloristConnection: Links a Shopify shop to a Bloom florist via API key
- FloristProduct: Products synced from Shopify
- FloristTierMapping: Maps subscription tiers to Shopify products
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class FloristConnection(Base):
    """
    Links a Shopify shop domain to a Bloom florist via API key.

    Created when a florist connects their store in the Shopify app.
    The api_key_hash stores a hashed version of the key for lookup.
    """
    __tablename__ = "florist_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    florist_id = Column(
        UUID(as_uuid=True),
        ForeignKey("florists.id", ondelete="CASCADE"),
        nullable=False,
    )
    shop_domain = Column(String(255), nullable=False, unique=True)
    api_key_hash = Column(String(128), nullable=False, unique=True)
    connected_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    synced_count = Column(Integer, nullable=False, default=0)

    # Relationships
    florist = relationship("Florist", backref="connections")
    products = relationship(
        "FloristProduct", back_populates="connection", cascade="all, delete-orphan"
    )
    tier_mappings = relationship(
        "FloristTierMapping", back_populates="connection", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<FloristConnection(shop={self.shop_domain}, florist_id={self.florist_id})>"
