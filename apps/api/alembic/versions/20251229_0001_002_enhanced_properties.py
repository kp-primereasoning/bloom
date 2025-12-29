"""Enhanced properties table with new status and PM assignment

Revision ID: 002
Revises: 001
Create Date: 2025-12-29

Updates the properties table for enhanced admin view:
- New property status enum: CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE
- Adds property_manager_id column for PM assignment
- Migrates existing status values (DRAFT/SUBMITTED -> CREATED, ACTIVE -> ACTIVE)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create new property status enum with enhanced values
    propertystatus_v2 = postgresql.ENUM(
        'CREATED', 'PENDING_FLORIST', 'PENDING_PM', 'ACTIVE',
        name='propertystatus_v2',
        create_type=False
    )
    propertystatus_v2.create(op.get_bind(), checkfirst=True)
    
    # Add temporary column with new enum type
    op.add_column(
        'properties',
        sa.Column('status_new', propertystatus_v2, nullable=True)
    )
    
    # Migrate existing status values:
    # DRAFT -> CREATED
    # SUBMITTED -> CREATED  
    # ACTIVE -> ACTIVE
    op.execute("""
        UPDATE properties 
        SET status_new = CASE 
            WHEN status = 'ACTIVE' THEN 'ACTIVE'::propertystatus_v2
            ELSE 'CREATED'::propertystatus_v2
        END
    """)
    
    # Drop old status column and rename new one
    op.drop_column('properties', 'status')
    op.alter_column('properties', 'status_new', new_column_name='status', nullable=False)
    
    # Drop old enum type
    op.execute('DROP TYPE IF EXISTS propertystatus')
    
    # Add property_manager_id column
    op.add_column(
        'properties',
        sa.Column('property_manager_id', postgresql.UUID(as_uuid=True), nullable=True)
    )


def downgrade() -> None:
    # Remove property_manager_id column
    op.drop_column('properties', 'property_manager_id')
    
    # Recreate old property status enum
    propertystatus = postgresql.ENUM(
        'DRAFT', 'SUBMITTED', 'ACTIVE',
        name='propertystatus',
        create_type=False
    )
    propertystatus.create(op.get_bind(), checkfirst=True)
    
    # Add temporary column with old enum type
    op.add_column(
        'properties',
        sa.Column('status_old', propertystatus, nullable=True)
    )
    
    # Migrate status values back:
    # CREATED -> DRAFT
    # PENDING_FLORIST -> DRAFT
    # PENDING_PM -> DRAFT
    # ACTIVE -> ACTIVE
    op.execute("""
        UPDATE properties 
        SET status_old = CASE 
            WHEN status = 'ACTIVE' THEN 'ACTIVE'::propertystatus
            ELSE 'DRAFT'::propertystatus
        END
    """)
    
    # Drop new status column and rename old one
    op.drop_column('properties', 'status')
    op.alter_column('properties', 'status_old', new_column_name='status', nullable=False)
    
    # Drop new enum type
    op.execute('DROP TYPE IF EXISTS propertystatus_v2')
