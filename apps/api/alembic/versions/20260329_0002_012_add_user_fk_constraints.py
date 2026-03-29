"""Add foreign key constraints linking tables to users.

Revision ID: 012
Revises: 011
Create Date: 2026-03-29
"""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # deliveries.user_id → users.id (RESTRICT: never lose delivery records)
    op.create_foreign_key(
        "fk_deliveries_user_id",
        "deliveries", "users",
        ["user_id"], ["id"],
        ondelete="RESTRICT",
    )

    # payments.user_id → users.id (RESTRICT: never lose payment records)
    op.create_foreign_key(
        "fk_payments_user_id",
        "payments", "users",
        ["user_id"], ["id"],
        ondelete="RESTRICT",
    )

    # invoices.user_id → users.id (RESTRICT: never lose invoice records)
    op.create_foreign_key(
        "fk_invoices_user_id",
        "invoices", "users",
        ["user_id"], ["id"],
        ondelete="RESTRICT",
    )

    # pm_preferences.user_id → users.id (CASCADE: preferences go with user)
    op.create_foreign_key(
        "fk_pm_preferences_user_id",
        "pm_preferences", "users",
        ["user_id"], ["id"],
        ondelete="CASCADE",
    )

    # properties.property_manager_id → users.id (SET NULL: property stays, loses PM)
    op.create_foreign_key(
        "fk_properties_property_manager_id",
        "properties", "users",
        ["property_manager_id"], ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_properties_property_manager_id", "properties", type_="foreignkey")
    op.drop_constraint("fk_pm_preferences_user_id", "pm_preferences", type_="foreignkey")
    op.drop_constraint("fk_invoices_user_id", "invoices", type_="foreignkey")
    op.drop_constraint("fk_payments_user_id", "payments", type_="foreignkey")
    op.drop_constraint("fk_deliveries_user_id", "deliveries", type_="foreignkey")
