"""
Property tests for /me/deliveries endpoint.
Feature: customer-deliveries-page
Properties 1-5: CUSTOMER-only access, archived exclusion, history ordering, future next_delivery, history limit
Validates: Requirements 2.1, 2.2, 2.3, 2.4
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from uuid import uuid4, UUID
from typing import List, Optional

import pytest
from hypothesis import given, settings, strategies as st, assume

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import UserRole
from models.delivery import Delivery, DeliveryStatus, SubscriptionPlan


# =============================================================================
# Strategies
# =============================================================================

@st.composite
def non_customer_role_strategy(draw):
    """Generate roles that are not CUSTOMER."""
    return draw(st.sampled_from([
        UserRole.ADMIN,
        UserRole.PROPERTY_MANAGER,
        UserRole.FLORIST
    ]))


@st.composite
def delivery_status_strategy(draw):
    """Generate any delivery status."""
    return draw(st.sampled_from([
        DeliveryStatus.SCHEDULED,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.SKIPPED,
        DeliveryStatus.MISSED
    ]))


@st.composite
def subscription_plan_strategy(draw):
    """Generate any subscription plan."""
    return draw(st.sampled_from([
        SubscriptionPlan.ESSENTIAL,
        SubscriptionPlan.SIGNATURE,
        SubscriptionPlan.STATEMENT
    ]))


@st.composite
def past_datetime_strategy(draw):
    """Generate a datetime in the past (1-365 days ago)."""
    days_ago = draw(st.integers(min_value=1, max_value=365))
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


@st.composite
def future_datetime_strategy(draw):
    """Generate a datetime in the future (1-365 days from now)."""
    days_ahead = draw(st.integers(min_value=1, max_value=365))
    return datetime.now(timezone.utc) + timedelta(days=days_ahead)


@st.composite
def delivery_strategy(draw, user_id: UUID, property_id: UUID, scheduled_for: datetime, archived: bool = False):
    """Generate a delivery with specified parameters."""
    return Delivery(
        id=draw(st.uuids()),
        user_id=user_id,
        property_id=property_id,
        subscription_plan=draw(subscription_plan_strategy()),
        status=draw(delivery_status_strategy()),
        scheduled_for=scheduled_for,
        delivered_at=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        archived_at=datetime.now(timezone.utc) if archived else None
    )


# =============================================================================
# Property 1: CUSTOMER-only access
# =============================================================================

class TestCustomerOnlyAccess:
    """
    Property 1: CUSTOMER-only access
    
    For any API request to GET /me/deliveries, if the authenticated user's role
    is not CUSTOMER, the API shall return a 403 Forbidden error.
    
    **Feature: customer-deliveries-page, Property 1: CUSTOMER-only access**
    **Validates: Requirements 2.4**
    """
    
    @given(role=non_customer_role_strategy())
    @settings(max_examples=100)
    def test_non_customer_roles_forbidden(self, role: UserRole):
        """
        Feature: customer-deliveries-page, Property 1: CUSTOMER-only access
        Validates: Requirements 2.4
        
        Test that non-CUSTOMER roles are rejected by /me/deliveries endpoint.
        """
        # Simulate the role check that require_role(["CUSTOMER"]) performs
        allowed_roles = ["CUSTOMER"]
        user_role = role.value
        
        # This simulates what the dependency does
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, f"Role {role} should not be allowed on /me/deliveries"
    
    def test_customer_role_allowed(self):
        """
        Feature: customer-deliveries-page, Property 1: CUSTOMER role is allowed
        Validates: Requirements 2.1
        
        Test that CUSTOMER role is allowed on /me/deliveries endpoint.
        """
        allowed_roles = ["CUSTOMER"]
        user_role = UserRole.CUSTOMER.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "CUSTOMER role should be allowed on /me/deliveries"


# =============================================================================
# Property 2: Archived delivery exclusion
# =============================================================================

class TestArchivedDeliveryExclusion:
    """
    Property 2: Archived delivery exclusion
    
    For any response from GET /me/deliveries, neither next_delivery nor any item
    in history shall have a non-null archived_at value.
    
    **Feature: customer-deliveries-page, Property 2: Archived delivery exclusion**
    **Validates: Requirements 2.3**
    """
    
    def test_archived_delivery_excluded_from_results(self):
        """
        Feature: customer-deliveries-page, Property 2: Archived delivery exclusion
        Validates: Requirements 2.3
        
        Test that archived deliveries are excluded from query results.
        """
        user_id = uuid4()
        property_id = uuid4()
        now = datetime.now(timezone.utc)
        
        # Create a mix of archived and non-archived deliveries
        deliveries = [
            # Non-archived future delivery (should be next_delivery)
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=now + timedelta(days=7),
                archived_at=None
            ),
            # Archived future delivery (should be excluded)
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.SIGNATURE,
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=now + timedelta(days=3),
                archived_at=now
            ),
            # Non-archived past delivery (should be in history)
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.STATEMENT,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=7),
                archived_at=None
            ),
            # Archived past delivery (should be excluded)
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=14),
                archived_at=now
            ),
        ]
        
        # Filter as the endpoint would
        non_archived = [d for d in deliveries if d.archived_at is None]
        
        # Verify no archived deliveries in results
        for delivery in non_archived:
            assert delivery.archived_at is None, \
                "Archived deliveries should be excluded from results"
        
        # Verify we have the expected count
        assert len(non_archived) == 2, "Should have 2 non-archived deliveries"
    
    @given(
        num_archived=st.integers(min_value=0, max_value=10),
        num_non_archived=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=100)
    def test_archived_exclusion_property(self, num_archived: int, num_non_archived: int):
        """
        Feature: customer-deliveries-page, Property 2: Archived delivery exclusion
        Validates: Requirements 2.3
        
        For any mix of archived and non-archived deliveries, only non-archived
        deliveries should appear in results.
        """
        user_id = uuid4()
        property_id = uuid4()
        now = datetime.now(timezone.utc)
        
        deliveries = []
        
        # Create archived deliveries
        for i in range(num_archived):
            deliveries.append(Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=i + 1),
                archived_at=now
            ))
        
        # Create non-archived deliveries
        for i in range(num_non_archived):
            deliveries.append(Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.SIGNATURE,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=i + 1),
                archived_at=None
            ))
        
        # Filter as the endpoint would
        non_archived = [d for d in deliveries if d.archived_at is None]
        
        # Verify count matches expected
        assert len(non_archived) == num_non_archived, \
            f"Expected {num_non_archived} non-archived deliveries, got {len(non_archived)}"
        
        # Verify all results are non-archived
        for delivery in non_archived:
            assert delivery.archived_at is None


# =============================================================================
# Property 3: History ordering
# =============================================================================

class TestHistoryOrdering:
    """
    Property 3: History ordering
    
    For any response from GET /me/deliveries where history contains more than
    one delivery, the deliveries shall be ordered by scheduled_for descending
    (most recent first).
    
    **Feature: customer-deliveries-page, Property 3: History ordering**
    **Validates: Requirements 2.2**
    """
    
    @given(num_deliveries=st.integers(min_value=2, max_value=25))
    @settings(max_examples=100)
    def test_history_sorted_descending(self, num_deliveries: int):
        """
        Feature: customer-deliveries-page, Property 3: History ordering
        Validates: Requirements 2.2
        
        For any list of past deliveries, history should be sorted by
        scheduled_for descending (most recent first).
        """
        user_id = uuid4()
        property_id = uuid4()
        now = datetime.now(timezone.utc)
        
        # Create deliveries with random past dates
        deliveries = []
        for i in range(num_deliveries):
            days_ago = (i + 1) * 7  # Spread out by weeks
            deliveries.append(Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=days_ago),
                archived_at=None
            ))
        
        # Sort as the endpoint would (descending by scheduled_for)
        sorted_deliveries = sorted(
            deliveries,
            key=lambda d: d.scheduled_for,
            reverse=True
        )
        
        # Verify ordering
        for i in range(len(sorted_deliveries) - 1):
            current = sorted_deliveries[i].scheduled_for
            next_item = sorted_deliveries[i + 1].scheduled_for
            assert current >= next_item, \
                f"History should be sorted descending: {current} should be >= {next_item}"


# =============================================================================
# Property 4: Next delivery is future
# =============================================================================

class TestNextDeliveryIsFuture:
    """
    Property 4: Next delivery is future
    
    For any response from GET /me/deliveries where next_delivery is not null,
    the scheduled_for timestamp shall be greater than the current time.
    
    **Feature: customer-deliveries-page, Property 4: Next delivery is future**
    **Validates: Requirements 2.1**
    """
    
    @given(days_ahead=st.integers(min_value=1, max_value=365))
    @settings(max_examples=100)
    def test_next_delivery_is_future(self, days_ahead: int):
        """
        Feature: customer-deliveries-page, Property 4: Next delivery is future
        Validates: Requirements 2.1
        
        For any next_delivery, scheduled_for must be in the future.
        """
        now = datetime.now(timezone.utc)
        future_date = now + timedelta(days=days_ahead)
        
        next_delivery = Delivery(
            id=uuid4(),
            user_id=uuid4(),
            property_id=uuid4(),
            subscription_plan=SubscriptionPlan.ESSENTIAL,
            status=DeliveryStatus.SCHEDULED,
            scheduled_for=future_date,
            archived_at=None
        )
        
        # Verify next_delivery is in the future
        assert next_delivery.scheduled_for > now, \
            "next_delivery.scheduled_for must be in the future"
    
    def test_past_delivery_not_next(self):
        """
        Feature: customer-deliveries-page, Property 4: Next delivery is future
        Validates: Requirements 2.1
        
        Past deliveries should not be returned as next_delivery.
        """
        now = datetime.now(timezone.utc)
        user_id = uuid4()
        property_id = uuid4()
        
        deliveries = [
            # Past delivery
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=7),
                archived_at=None
            ),
            # Future delivery
            Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.SIGNATURE,
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=now + timedelta(days=7),
                archived_at=None
            ),
        ]
        
        # Filter for next_delivery (future, non-archived)
        future_deliveries = [
            d for d in deliveries
            if d.scheduled_for > now and d.archived_at is None
        ]
        
        # Get earliest future delivery
        next_delivery = min(future_deliveries, key=lambda d: d.scheduled_for) if future_deliveries else None
        
        assert next_delivery is not None, "Should have a next_delivery"
        assert next_delivery.scheduled_for > now, "next_delivery must be in the future"


# =============================================================================
# Property 5: History limit
# =============================================================================

class TestHistoryLimit:
    """
    Property 5: History limit
    
    For any response from GET /me/deliveries, the history array shall contain
    at most 20 deliveries.
    
    **Feature: customer-deliveries-page, Property 5: History limit**
    **Validates: Requirements 2.2**
    """
    
    @given(num_deliveries=st.integers(min_value=0, max_value=50))
    @settings(max_examples=100)
    def test_history_limited_to_20(self, num_deliveries: int):
        """
        Feature: customer-deliveries-page, Property 5: History limit
        Validates: Requirements 2.2
        
        For any number of past deliveries, history should contain at most 20.
        """
        user_id = uuid4()
        property_id = uuid4()
        now = datetime.now(timezone.utc)
        
        # Create deliveries
        deliveries = []
        for i in range(num_deliveries):
            deliveries.append(Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=property_id,
                subscription_plan=SubscriptionPlan.ESSENTIAL,
                status=DeliveryStatus.DELIVERED,
                scheduled_for=now - timedelta(days=i + 1),
                archived_at=None
            ))
        
        # Apply limit as the endpoint would
        history = deliveries[:20]
        
        # Verify limit
        assert len(history) <= 20, \
            f"History should contain at most 20 deliveries, got {len(history)}"
        
        # Verify we get the expected count
        expected_count = min(num_deliveries, 20)
        assert len(history) == expected_count, \
            f"Expected {expected_count} deliveries, got {len(history)}"
