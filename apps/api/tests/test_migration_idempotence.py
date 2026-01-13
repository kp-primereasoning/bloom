"""
Property test for migration idempotence.
Feature: local-dev-setup, Property 2: Migration Idempotence
Validates: Requirements 2.3

For any sequence of `pnpm db:migrate` executions (1 or more times), 
the resulting database schema SHALL be identical to running migrations exactly once.
"""

import os
import sys
from typing import Set

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_schema_state(engine) -> Set[str]:
    """
    Get the current database schema state as a set of table names.
    This is a simplified representation - in production you might
    compare full DDL or use pg_dump.
    """
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    return tables


def run_migrations(alembic_cfg):
    """Run alembic upgrade head."""
    from alembic import command
    command.upgrade(alembic_cfg, "head")


def get_alembic_config():
    """Get Alembic configuration."""
    from alembic.config import Config
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini = os.path.join(base_dir, "alembic.ini")
    
    alembic_cfg = Config(alembic_ini)
    alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
    
    return alembic_cfg


class TestMigrationIdempotence:
    """Property tests for migration idempotence."""
    
    @given(run_count=st.integers(min_value=1, max_value=5))
    @settings(max_examples=100)
    def test_migrations_are_idempotent(self, run_count: int):
        """
        Property 2: Migration Idempotence
        
        For any number of migration runs (1 to N), the resulting schema
        should be identical to running migrations exactly once.
        
        This test verifies that Alembic's upgrade head is idempotent -
        running it multiple times produces the same result as running once.
        """
        # Skip if no database connection available (CI without DB)
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping migration test")
        
        from sqlalchemy import create_engine
        
        # Create engine for schema inspection
        engine = create_engine(database_url)
        
        try:
            # Get Alembic config
            alembic_cfg = get_alembic_config()
            
            # Run migrations once and capture schema
            run_migrations(alembic_cfg)
            schema_after_one_run = get_schema_state(engine)
            
            # Run migrations N-1 more times
            for _ in range(run_count - 1):
                run_migrations(alembic_cfg)
            
            # Capture schema after N runs
            schema_after_n_runs = get_schema_state(engine)
            
            # Schema should be identical
            assert schema_after_one_run == schema_after_n_runs, (
                f"Schema differs after {run_count} migration runs. "
                f"After 1 run: {schema_after_one_run}, "
                f"After {run_count} runs: {schema_after_n_runs}"
            )
        finally:
            engine.dispose()
    
    def test_migrations_reach_head(self):
        """
        Verify that migrations successfully reach head state.
        This is a basic sanity check that migrations work at all.
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping migration test")
        
        from alembic import command
        from alembic.script import ScriptDirectory
        
        alembic_cfg = get_alembic_config()
        
        # Run migrations
        run_migrations(alembic_cfg)
        
        # Verify we're at head
        script = ScriptDirectory.from_config(alembic_cfg)
        head_revision = script.get_current_head()
        
        # Get current revision from database
        from sqlalchemy import create_engine, text
        engine = create_engine(database_url)
        
        try:
            with engine.connect() as conn:
                result = conn.execute(
                    text("SELECT version_num FROM alembic_version")
                )
                current_revision = result.scalar()
            
            assert current_revision == head_revision, (
                f"Database not at head. Current: {current_revision}, Head: {head_revision}"
            )
        finally:
            engine.dispose()
