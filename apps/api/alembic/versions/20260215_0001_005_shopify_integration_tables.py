"""Add florist_connections, florist_products, florist_tier_mappings tables

Revision ID: 005_shopify_integration
Revises: 20251230_0001_004
Create Date: 2026-02-15
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "005_shopify_integration"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "florist_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "florist_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("florists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("shop_domain", sa.String(255), nullable=False, unique=True),
        sa.Column("api_key_hash", sa.String(128), nullable=False, unique=True),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("synced_count", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "florist_products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "connection_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("florist_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("shopify_product_id", sa.String(64), nullable=False),
        sa.Column("shopify_variant_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("price", sa.String(20), nullable=False, server_default="0.00"),
        sa.Column("image_url", sa.String(2048), nullable=True),
        sa.Column("inventory_quantity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    op.create_table(
        "florist_tier_mappings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "connection_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("florist_connections.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tier", sa.String(20), nullable=False),
        sa.Column("shopify_product_id", sa.String(64), nullable=False),
        sa.Column("product_title", sa.String(500), nullable=False),
        sa.Column("product_price", sa.String(20), nullable=False, server_default="0.00"),
        sa.Column(
            "mapped_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("connection_id", "tier", name="uq_connection_tier"),
    )


def downgrade() -> None:
    op.drop_table("florist_tier_mappings")
    op.drop_table("florist_products")
    op.drop_table("florist_connections")
