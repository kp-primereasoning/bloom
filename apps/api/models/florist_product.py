"""
FloristProduct model — stores products synced from a florist's Shopify store.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from db.database import Base


class FloristProduct(Base):
    """A product synced from a florist's Shopify catalog."""
    __tablename__ = "florist_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(
        UUID(as_uuid=True),
        ForeignKey("florist_connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    shopify_product_id = Column(String(64), nullable=False)
    shopify_variant_id = Column(String(64), nullable=False)
    title = Column(String(500), nullable=False)
    price = Column(String(20), nullable=False, default="0.00")
    image_url = Column(String(2048), nullable=True)
    inventory_quantity = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="active")
    synced_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    connection = relationship("FloristConnection", back_populates="products")

    def __repr__(self) -> str:
        return f"<FloristProduct(title='{self.title}', shopify_id={self.shopify_product_id})>"
