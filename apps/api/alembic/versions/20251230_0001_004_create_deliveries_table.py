"""Create deliveries table

Revision ID: 004
Revises: 003
Create Date: 2025-12-30

Creates the deliveries table for tracking customer floral deliveries:
- Stores scheduled and completed deliveries
- Links to properties via foreign key
- References users by ID (in-memory store)
- Supports soft delete via archived_at

Includes:
- Enum types for subscription_plan and delivery status
- Foreign key constraint to properties table
- Indexes for common query patterns
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create subscription plan enum
    subscriptionplan = postgresql.ENUM(
        'ESSENTIAL', 'SIGNATURE', 'STATEMENT',
        name='subscriptionplan',
        create_type=False
    )
    subscriptionplan.create(op.get_bind(), checkfirst=True)
    
    # Create delivery status enum
    deliverystatus = postgresql.ENUM(
        'SCHEDULED', 'DELIVERED', 'SKIPPED', 'MISSED',
        name='deliverystatus',
        create_type=False
    )
    deliverystatus.create(op.get_bind(), checkfirst=True)
    
    # Create deliveries table
    op.create_table(
        'deliveries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('properties.id', ondelete='CASCADE'), nullable=False),
        sa.Column('subscription_plan', subscriptionplan, nullable=False),
        sa.Column('status', deliverystatus, nullable=False, server_default='SCHEDULED'),
        sa.Column('scheduled_for', sa.DateTime(timezone=True), nullable=False),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True),
    )
    
    # Create indexes for common query patterns
    op.create_index(
        'ix_deliveries_user_id',
        'deliveries',
        ['user_id']
    )
    op.create_index(
        'ix_deliveries_scheduled_for',
        'deliveries',
        ['scheduled_for']
    )
    op.create_index(
        'ix_deliveries_user_scheduled',
        'deliveries',
        ['user_id', 'scheduled_for']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_deliveries_user_scheduled', table_name='deliveries')
    op.drop_index('ix_deliveries_scheduled_for', table_name='deliveries')
    op.drop_index('ix_deliveries_user_id', table_name='deliveries')
    
    # Drop table
    op.drop_table('deliveries')
    
    # Drop enum types
    op.execute('DROP TYPE IF EXISTS deliverystatus')
    op.execute('DROP TYPE IF EXISTS subscriptionplan')
