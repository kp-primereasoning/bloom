"""Create users table — migrate from in-memory store to PostgreSQL.

Revision ID: 011
Revises: 010
Create Date: 2026-03-29
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="ACTIVE"),
        sa.Column("property_id", UUID(as_uuid=True), nullable=True),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column("subscription_status", sa.String(20), nullable=True, server_default="CREATED"),
        sa.Column("subscription_plan", sa.String(20), nullable=True),
        sa.Column("florist_id", UUID(as_uuid=True), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("skip_next_delivery", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("email_notifications_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="users_email_unique"),
    )

    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])
    op.create_index("ix_users_property_id", "users", ["property_id"])


def downgrade() -> None:
    op.drop_index("ix_users_property_id")
    op.drop_index("ix_users_role")
    op.drop_index("ix_users_email")
    op.drop_table("users")
