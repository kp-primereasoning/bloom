"""Add users table — migrate from in-memory store to Postgres.

Revision ID: 011
Revises: 010
Create Date: 2026-03-28
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
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("CUSTOMER", "PROPERTY_MANAGER", "FLORIST", "ADMIN", name="userrole"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "ARCHIVED", name="userstatus"),
            nullable=False,
            server_default="ACTIVE",
        ),
        sa.Column(
            "property_id",
            UUID(as_uuid=True),
            sa.ForeignKey("properties.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("unit", sa.String(50), nullable=True),
        sa.Column(
            "subscription_status",
            sa.Enum("CREATED", "ACTIVE", "PAUSED", name="subscriptionstatus"),
            nullable=False,
            server_default="CREATED",
        ),
        sa.Column(
            "subscription_plan",
            sa.Enum("ESSENTIAL", "SIGNATURE", "STATEMENT", name="subscriptionplan"),
            nullable=True,
        ),
        sa.Column(
            "florist_id",
            UUID(as_uuid=True),
            sa.ForeignKey("florists.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("skip_next_delivery", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("email_notifications_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("cognito_sub", sa.String(255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=True,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_cognito_sub", "users", ["cognito_sub"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_cognito_sub", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS userstatus")
    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
