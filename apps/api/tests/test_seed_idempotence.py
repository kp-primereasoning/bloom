"""
Property test for seed data idempotence.

Property 7: Seed Idempotence
For any number of seed executions, the resulting data state SHALL be identical
(same entity counts, no duplicates).

Validates: Requirements 8.5
"""

import os
import sys
import asyncio
from typing import Dict

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_record_counts() -> Dict[str, int]:
    """
    Get the current count of seeded records.
    Returns a dict with counts for properties, florists, and deliveries.
    """
    from db.database import SessionLocal
    from models.property import Property
    from models.florist import Florist
    from models.delivery import Delivery
    
    db = SessionLocal()
    try:
        return {
            "properties": db.query(Property).count(),
            "florists": db.query(Florist).count(),
            "deliveries": db.query(Delivery).count(),
        }
    finally:
        db.close()


def get_user_counts() -> Dict[str, int]:
    """Get counts of users by role from the database."""
    from db.database import SessionLocal
    from models.user import UserDB, UserRole

    db = SessionLocal()
    try:
        all_users = db.query(UserDB).all()
        counts = {
            "total": len(all_users),
            "admin": 0,
            "florist": 0,
            "pm": 0,
            "customer": 0,
        }
        for user in all_users:
            if user.role == UserRole.ADMIN:
                counts["admin"] += 1
            elif user.role == UserRole.FLORIST:
                counts["florist"] += 1
            elif user.role == UserRole.PROPERTY_MANAGER:
                counts["pm"] += 1
            elif user.role == UserRole.CUSTOMER:
                counts["customer"] += 1
        return counts
    finally:
        db.close()


def run_seed_sync():
    """Run the synchronous seed function."""
    from db.seed import seed_dev_users_sync
    seed_dev_users_sync()


def clear_all_data():
    """Clear all seeded data for fresh test."""
    from db.users import clear_users
    from db.database import SessionLocal
    from models.property import Property
    from models.florist import Florist
    from models.property_assignment import PropertyAssignment
    from models.delivery import Delivery
    
    clear_users()
    
    db = SessionLocal()
    try:
        db.query(Delivery).delete()
        db.query(PropertyAssignment).delete()
        db.query(Property).delete()
        db.query(Florist).delete()
        db.commit()
    finally:
        db.close()


class TestSeedIdempotence:
    """Property tests for seed data idempotence."""
    
    def setup_method(self):
        """Clear data before each test."""
        clear_all_data()
    
    @given(run_count=st.integers(min_value=1, max_value=3))
    @settings(max_examples=10, deadline=None)
    def test_seed_is_idempotent(self, run_count: int):
        """
        Property 7: Seed Data Idempotence
        
        For any number of seed runs (1 to N), the number of seeded records
        should remain constant - no duplicates should be created.
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        clear_all_data()
        
        # Run seed once and capture counts
        run_seed_sync()
        db_counts_after_one = get_record_counts()
        user_counts_after_one = get_user_counts()
        
        # Run seed N-1 more times
        for _ in range(run_count - 1):
            run_seed_sync()
        
        # Capture counts after N runs
        db_counts_after_n = get_record_counts()
        user_counts_after_n = get_user_counts()
        
        # Counts should be identical
        assert db_counts_after_one == db_counts_after_n, (
            f"DB record counts differ after {run_count} seed runs. "
            f"After 1 run: {db_counts_after_one}, "
            f"After {run_count} runs: {db_counts_after_n}"
        )
        
        assert user_counts_after_one == user_counts_after_n, (
            f"User counts differ after {run_count} seed runs. "
            f"After 1 run: {user_counts_after_one}, "
            f"After {run_count} runs: {user_counts_after_n}"
        )
    
    def test_seed_creates_expected_properties(self):
        """Verify seeding creates 5 properties."""
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        run_seed_sync()
        counts = get_record_counts()
        
        assert counts["properties"] == 5, (
            f"Expected 5 properties, got {counts['properties']}"
        )
    
    def test_seed_creates_expected_florists(self):
        """Verify seeding creates 3 florists."""
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        run_seed_sync()
        counts = get_record_counts()
        
        assert counts["florists"] == 3, (
            f"Expected 3 florists, got {counts['florists']}"
        )
    
    def test_seed_creates_expected_users(self):
        """Verify seeding creates expected user distribution."""
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        run_seed_sync()
        counts = get_user_counts()
        
        # Expected: 1 admin, 1 florist, 2 PMs, 30 customers = 34 total
        assert counts["admin"] == 1, f"Expected 1 admin, got {counts['admin']}"
        assert counts["florist"] == 1, f"Expected 1 florist, got {counts['florist']}"
        assert counts["pm"] == 2, f"Expected 2 PMs, got {counts['pm']}"
        assert counts["customer"] == 30, f"Expected 30 customers, got {counts['customer']}"
        assert counts["total"] == 34, f"Expected 34 total users, got {counts['total']}"
    
    def test_seed_creates_customer_status_distribution(self):
        """Verify customers have correct subscription status distribution."""
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")

        from db.database import SessionLocal
        from models.user import UserDB, UserRole, SubscriptionStatus

        run_seed_sync()

        db = SessionLocal()
        try:
            customers = db.query(UserDB).filter(UserDB.role == UserRole.CUSTOMER).all()
            created_count = sum(1 for c in customers if c.subscription_status == SubscriptionStatus.CREATED)
            active_count = sum(1 for c in customers if c.subscription_status == SubscriptionStatus.ACTIVE)
            paused_count = sum(1 for c in customers if c.subscription_status == SubscriptionStatus.PAUSED)
        finally:
            db.close()

        assert created_count == 10, f"Expected 10 CREATED customers, got {created_count}"
        assert active_count == 15, f"Expected 15 ACTIVE customers, got {active_count}"
        assert paused_count == 5, f"Expected 5 PAUSED customers, got {paused_count}"
    
    def test_seed_assigns_pms_to_properties(self):
        """Verify PM users are assigned to properties."""
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")

        from db.database import SessionLocal
        from models.user import UserDB, UserRole

        run_seed_sync()

        db = SessionLocal()
        try:
            pms = db.query(UserDB).filter(UserDB.role == UserRole.PROPERTY_MANAGER).all()
            assert len(pms) == 2, f"Expected 2 PMs, got {len(pms)}"
            for pm in pms:
                assert pm.property_id is not None, f"PM {pm.email} should have property_id"
        finally:
            db.close()


    def test_seed_creates_deliveries_for_active_customers(self):
        """
        Feature: customer-deliveries-page, Property 6: Seed idempotence
        Validates: Requirements 3.1, 3.2
        
        Verify ACTIVE customers have future and past deliveries.
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        from db.database import SessionLocal
        from models.user import UserDB, UserRole, SubscriptionStatus
        from models.delivery import Delivery
        from datetime import datetime, timezone

        run_seed_sync()

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # Get ACTIVE customers
            active_customers = db.query(UserDB).filter(
                UserDB.role == UserRole.CUSTOMER,
                UserDB.subscription_status == SubscriptionStatus.ACTIVE,
            ).all()

            assert len(active_customers) == 15, f"Expected 15 ACTIVE customers, got {len(active_customers)}"

            # Check each ACTIVE customer has deliveries
            for customer in active_customers:
                deliveries = db.query(Delivery).filter(Delivery.user_id == customer.id).all()
                
                # Should have at least 4 deliveries (1 future + 3 past minimum)
                assert len(deliveries) >= 4, (
                    f"ACTIVE customer {customer.email} should have at least 4 deliveries, got {len(deliveries)}"
                )
                
                # Should have at least 1 future delivery
                future_deliveries = [d for d in deliveries if d.scheduled_for > now]
                assert len(future_deliveries) >= 1, (
                    f"ACTIVE customer {customer.email} should have at least 1 future delivery"
                )
        finally:
            db.close()
    
    def test_seed_creates_deliveries_for_paused_customers(self):
        """
        Feature: customer-deliveries-page, Property 6: Seed idempotence
        Validates: Requirements 3.2
        
        Verify PAUSED customers have only past deliveries (no future).
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        from db.database import SessionLocal
        from models.user import UserDB, UserRole, SubscriptionStatus
        from models.delivery import Delivery
        from datetime import datetime, timezone

        run_seed_sync()

        db = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # Get PAUSED customers
            paused_customers = db.query(UserDB).filter(
                UserDB.role == UserRole.CUSTOMER,
                UserDB.subscription_status == SubscriptionStatus.PAUSED,
            ).all()

            assert len(paused_customers) == 5, f"Expected 5 PAUSED customers, got {len(paused_customers)}"
            
            # Check each PAUSED customer has only past deliveries
            for customer in paused_customers:
                deliveries = db.query(Delivery).filter(Delivery.user_id == customer.id).all()
                
                # Should have 2-3 past deliveries
                assert len(deliveries) >= 2, (
                    f"PAUSED customer {customer.email} should have at least 2 deliveries, got {len(deliveries)}"
                )
                
                # Should have NO future deliveries
                future_deliveries = [d for d in deliveries if d.scheduled_for > now]
                assert len(future_deliveries) == 0, (
                    f"PAUSED customer {customer.email} should have no future deliveries, got {len(future_deliveries)}"
                )
        finally:
            db.close()
    
    def test_seed_no_deliveries_for_created_customers(self):
        """
        Feature: customer-deliveries-page, Property 6: Seed idempotence
        Validates: Requirements 3.1
        
        Verify CREATED customers have no deliveries.
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        from db.database import SessionLocal
        from models.user import UserDB, UserRole, SubscriptionStatus
        from models.delivery import Delivery

        run_seed_sync()

        db = SessionLocal()
        try:
            # Get CREATED customers
            created_customers = db.query(UserDB).filter(
                UserDB.role == UserRole.CUSTOMER,
                UserDB.subscription_status == SubscriptionStatus.CREATED,
            ).all()

            assert len(created_customers) == 10, f"Expected 10 CREATED customers, got {len(created_customers)}"
            
            # Check each CREATED customer has NO deliveries
            for customer in created_customers:
                deliveries = db.query(Delivery).filter(Delivery.user_id == customer.id).all()
                
                assert len(deliveries) == 0, (
                    f"CREATED customer {customer.email} should have no deliveries, got {len(deliveries)}"
                )
        finally:
            db.close()
    
    def test_delivery_seed_is_idempotent(self):
        """
        Feature: customer-deliveries-page, Property 6: Seed idempotence
        Validates: Requirements 3.3
        
        For any number of seed runs, delivery count should remain constant.
        """
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            pytest.skip("DATABASE_URL not set - skipping seed test")
        
        clear_all_data()
        
        # Run seed once and capture delivery count
        run_seed_sync()
        counts_after_one = get_record_counts()
        
        # Run seed again
        run_seed_sync()
        counts_after_two = get_record_counts()
        
        # Run seed a third time
        run_seed_sync()
        counts_after_three = get_record_counts()
        
        # Delivery counts should be identical
        assert counts_after_one["deliveries"] == counts_after_two["deliveries"], (
            f"Delivery count changed after second seed run. "
            f"After 1 run: {counts_after_one['deliveries']}, "
            f"After 2 runs: {counts_after_two['deliveries']}"
        )
        
        assert counts_after_two["deliveries"] == counts_after_three["deliveries"], (
            f"Delivery count changed after third seed run. "
            f"After 2 runs: {counts_after_two['deliveries']}, "
            f"After 3 runs: {counts_after_three['deliveries']}"
        )
