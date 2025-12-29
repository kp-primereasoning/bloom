"""Create core domain tables

Revision ID: 001
Revises: 
Create Date: 2025-12-28

Creates the foundational tables for the Bloom platform:
- properties: Physical locations participating in floral subscriptions
- florists: Flower vendors who fulfill deliveries
- property_assignments: Links florists to properties

Includes:
- pgcrypto extension for UUID generation
- Enum types for status fields
- Partial unique index for single active assignment per property
- Foreign key constraints with CASCADE delete
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgcrypto extension for UUID generation
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    
    # Create property status enum
    propertystatus = postgresql.ENUM(
        'DRAFT', 'SUBMITTED', 'ACTIVE',
        name='propertystatus',
        create_type=False
    )
    propertystatus.create(op.get_bind(), checkfirst=True)
    
    # Create florist status enum
    floriststatus = postgresql.ENUM(
        'ONBOARDING', 'READY',
        name='floriststatus',
        create_type=False
    )
    floriststatus.create(op.get_bind(), checkfirst=True)
    
    # Create properties table
    # Note: updated_at is managed at ORM layer (SQLAlchemy onupdate), not DB-level
    op.create_table(
        'properties',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.String(500), nullable=False),
        sa.Column('status', propertystatus, nullable=False, server_default='DRAFT'),
        sa.Column('delivery_cadence', sa.String(100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create florists table
    op.create_table(
        'florists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('status', floriststatus, nullable=False, server_default='ONBOARDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create property_assignments table
    op.create_table(
        'property_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('properties.id', ondelete='CASCADE'), nullable=False),
        sa.Column('florist_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('florists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    
    # Create partial unique index for one active assignment per property
    # This ensures at most one row with active=true per property_id
    op.create_index(
        'ix_property_assignments_one_active_per_property',
        'property_assignments',
        ['property_id'],
        unique=True,
        postgresql_where=sa.text('active = true')
    )


def downgrade() -> None:
    # Drop index first
    op.drop_index('ix_property_assignments_one_active_per_property', table_name='property_assignments')
    
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('property_assignments')
    op.drop_table('florists')
    op.drop_table('properties')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS propertystatus')
    op.execute('DROP TYPE IF EXISTS floriststatus')
    
    # Note: pgcrypto extension is not dropped as it may be used by other tables
