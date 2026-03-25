"""Add florist_availability table.

Revision ID: 009
Revises: 008
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "florist_availability",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("florist_id", UUID(as_uuid=True), sa.ForeignKey("florists.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("max_deliveries_per_day", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_florist_availability_florist_day", "florist_availability", ["florist_id", "day_of_week"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_florist_availability_florist_day")
    op.drop_table("florist_availability")
