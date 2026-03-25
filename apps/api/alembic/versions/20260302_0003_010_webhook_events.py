"""Add webhook_events table for audit trail.

Revision ID: 010
Revises: 009
Create Date: 2026-03-02
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "webhook_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("source", sa.String(50), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("event_id", sa.String(255), nullable=True),
        sa.Column("payload_hash", sa.String(64), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="received"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_webhook_events_source_event_id", "webhook_events", ["source", "event_id"])


def downgrade() -> None:
    op.drop_index("ix_webhook_events_source_event_id")
    op.drop_table("webhook_events")
