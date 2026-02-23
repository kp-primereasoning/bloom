"""Create property_rewards and pm_preferences tables

Revision ID: 007_pm_dashboard
Revises: 006_delivery_generation
Create Date: 2026-02-16

Creates tables for PM Dashboard V2:
- property_rewards: Persisted reward tier and participation rate per property
- pm_preferences: Notification preferences per property manager
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = "007_pm_dashboard"
down_revision = "006_delivery_generation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create property_rewards table
    op.create_table(
        "property_rewards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "property_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("properties.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "tier",
            sa.String(10),
            nullable=False,
            server_default="Bronze",
        ),
        sa.Column(
            "participation_rate",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0.0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )

    # Create pm_preferences table
    op.create_table(
        "pm_preferences",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "delivery_reminders",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "participation_updates",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "rewards_milestones",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("pm_preferences")
    op.drop_table("property_rewards")
