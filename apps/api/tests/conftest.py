"""
Pytest configuration for API tests.

Provides fixtures and markers for database-dependent tests.
"""

import os
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


def is_db_available():
    """Check if PostgreSQL database is available."""
    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://bloom:bloom@localhost:5432/bloom"
    )
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
        return True
    except OperationalError:
        return False
    except Exception:
        return False


# Check DB availability once at session start
DB_AVAILABLE = is_db_available()


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers",
        "requires_db: mark test as requiring database connection"
    )


def pytest_collection_modifyitems(config, items):
    """Skip tests that require database when DB is not available."""
    if DB_AVAILABLE:
        return

    skip_db = pytest.mark.skip(reason="PostgreSQL database not available")

    for item in items:
        # Skip tests marked with requires_db
        if "requires_db" in item.keywords:
            item.add_marker(skip_db)

        # Also skip tests in files that are known to require DB
        db_required_files = [
            "test_seed_idempotence.py",
            "test_migration_idempotence.py",
            "test_pm_assignment_status_recomputation.py",
            "test_onboarding_integration.py",
        ]

        # Skip specific tests that require DB even if file has other non-DB tests
        db_required_tests = [
            "test_admin_can_access_get_endpoints",
            "test_invalid_property_returns_error_envelope",
            "test_created_status_returns_error_envelope",
            "test_property_id_cleared_when_role_changes_from_pm",
            "test_pm_to_admin_clears_property_id",
            "test_assignment_validates_property_exists",
            "test_assignment_validates_florist_exists",
            "test_validation_error_for_invalid_property_id_update",
            "test_pm_with_invalid_property_id_rejected",
        ]
        if item.name in db_required_tests:
            item.add_marker(skip_db)
        for db_file in db_required_files:
            if db_file in str(item.fspath):
                item.add_marker(skip_db)
                break
