"""Add ARCHIVED status to property and florist enums

Revision ID: 003
Revises: 002
Create Date: 2025-12-29

Adds ARCHIVED status to property and florist status enums for soft delete support.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add ARCHIVED to propertystatus_v2 enum
    op.execute("ALTER TYPE propertystatus_v2 ADD VALUE IF NOT EXISTS 'ARCHIVED'")
    
    # Add ARCHIVED to floriststatus enum
    op.execute("ALTER TYPE floriststatus ADD VALUE IF NOT EXISTS 'ARCHIVED'")


def downgrade() -> None:
    # Note: PostgreSQL doesn't support removing enum values directly
    # We would need to recreate the enum types without ARCHIVED
    # For simplicity, we'll leave the enum values in place during downgrade
    # as they won't cause issues if unused
    pass
