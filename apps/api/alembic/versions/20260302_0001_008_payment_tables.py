"""Create payment, invoice, and florist_payout tables; add stripe columns to users

Revision ID: 008_payment_tables
Revises: 007_pm_dashboard
Create Date: 2026-03-02

Phase 1 of Stripe integration:
- payments: records individual payment events
- invoices: mirrors Stripe invoice records
- florist_payouts: tracks payouts to florists
- users.stripe_customer_id: links user to Stripe Customer
- users.stripe_subscription_id: links user to Stripe Subscription
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008_payment_tables"
down_revision = "007_pm_dashboard"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create payments table
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("property_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("properties.id"), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True, unique=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("subscription_plan", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create invoices table
    op.create_table(
        "invoices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_invoice_id", sa.String(255), nullable=True, unique=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column("status", sa.String(50), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_url", sa.String(1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Create florist_payouts table
    op.create_table(
        "florist_payouts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("florist_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("florists.id"), nullable=False),
        sa.Column("stripe_transfer_id", sa.String(255), nullable=True, unique=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Add Stripe columns to users table
    # Note: users are in-memory for MLP, but we add these columns for when
    # we migrate to DB-backed users. For now the in-memory User model
    # carries these fields.
    # If users table exists in DB, uncomment:
    # op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    # op.add_column("users", sa.Column("stripe_subscription_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_table("florist_payouts")
    op.drop_table("invoices")
    op.drop_table("payments")
    # op.drop_column("users", "stripe_subscription_id")
    # op.drop_column("users", "stripe_customer_id")
