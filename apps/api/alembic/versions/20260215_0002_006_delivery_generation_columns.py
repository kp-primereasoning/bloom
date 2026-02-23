"""Add next_delivery_date and delivery_lead_days to properties

Revision ID: 006_delivery_generation
Revises: 005_shopify_integration
Create Date: 2026-02-15
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = "006_delivery_generation"
down_revision = "005_shopify_integration"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "properties",
        sa.Column("next_delivery_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "properties",
        sa.Column(
            "delivery_lead_days",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )


def downgrade() -> None:
    op.drop_column("properties", "delivery_lead_days")
    op.drop_column("properties", "next_delivery_date")
