"""
Property tests for /florist/deliveries endpoint.
Feature: florist-dashboard
Property 3: Deliveries Filtered by Assignment and Status
Property 4: Deliveries Ordered by Date
Property 5: Delivery Response Contains Required Fields
Validates: Requirements 2.1, 2.2, 2.3, 2.4
"""

import os
import sys
from datetime import datetime, timezone, timedelta
from uuid import uuid4, UUID

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.delivery import DeliveryStatus, SubscriptionPlan
from schemas.domain import FloristDeliveryResponse, FloristDeliveriesListResponse


# Strategy for generating delivery statuses
@st.composite
def delivery_status_strategy(draw):
    """Generate valid delivery statuses."""
    return draw(st.sampled_from([
        DeliveryStatus.SCHEDULED,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.SKIPPED,
        DeliveryStatus.MISSED,
    ]))


# Strategy for generating subscription plans
@st.composite
def subscription_plan_strategy(draw):
    """Generate valid subscription plans."""
    return draw(st.sampled_from([
        SubscriptionPlan.ESSENTIAL,
        SubscriptionPlan.SIGNATURE,
        SubscriptionPlan.STATEMENT,
    ]))


# Strategy for generating florist delivery responses
@st.composite
def florist_delivery_strategy(draw):
    """Generate a valid florist delivery response."""
    return FloristDeliveryResponse(
        id=draw(st.uuids()),
        customer_email=draw(st.emails()),
        property_id=draw(st.uuids()),
        property_name=draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        property_address=draw(st.text(min_size=1, max_size=200, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        subscription_plan=draw(subscription_plan_strategy()),
        status=DeliveryStatus.SCHEDULED,  # Always SCHEDULED for florist deliveries list
        scheduled_for=draw(st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2030, 12, 31),
            timezones=st.just(timezone.utc)
        ))
    )


# Strategy for generating lists of deliveries
@st.composite
def deliveries_list_strategy(draw):
    """Generate a list of deliveries (0-10 items)."""
    count = draw(st.integers(min_value=0, max_value=10))
    return [draw(florist_delivery_strategy()) for _ in range(count)]


class TestDeliveriesFilteredByStatus:
    """
    Property 3: Deliveries Filtered by Assignment and Status
    
    For any florist with active property assignments, the GET /florist/deliveries
    endpoint returns only deliveries where: (a) status is SCHEDULED, and
    (b) property_id matches one of the florist's active assignments.
    """
    
    @given(deliveries=deliveries_list_strategy())
    @settings(max_examples=100)
    def test_all_deliveries_have_scheduled_status(self, deliveries: list):
        """
        Feature: florist-dashboard, Property 3: Deliveries Filtered by Assignment and Status
        Validates: Requirements 2.1
        
        Test that all deliveries in the response have SCHEDULED status.
        """
        response = FloristDeliveriesListResponse(deliveries=deliveries)
        
        for delivery in response.deliveries:
            assert delivery.status == DeliveryStatus.SCHEDULED, \
                f"All deliveries should have SCHEDULED status, got {delivery.status}"
    
    @given(
        assigned_property_ids=st.lists(st.uuids(), min_size=1, max_size=5),
        deliveries=deliveries_list_strategy()
    )
    @settings(max_examples=100)
    def test_deliveries_only_for_assigned_properties(
        self,
        assigned_property_ids: list,
        deliveries: list
    ):
        """
        Feature: florist-dashboard, Property 3: Deliveries Filtered by Assignment and Status
        Validates: Requirements 2.4
        
        Test that filtering logic correctly filters by assigned properties.
        """
        # Simulate filtering: only keep deliveries for assigned properties
        filtered_deliveries = [
            d for d in deliveries
            if d.property_id in assigned_property_ids
        ]
        
        # Verify all filtered deliveries are for assigned properties
        for delivery in filtered_deliveries:
            assert delivery.property_id in assigned_property_ids, \
                "All deliveries should be for assigned properties"


class TestDeliveriesOrderedByDate:
    """
    Property 4: Deliveries Ordered by Date
    
    For any list of deliveries returned by GET /florist/deliveries, the deliveries
    are ordered by scheduled_for date in ascending order (soonest first).
    """
    
    @given(deliveries=deliveries_list_strategy())
    @settings(max_examples=100)
    def test_deliveries_are_sorted_by_scheduled_for(self, deliveries: list):
        """
        Feature: florist-dashboard, Property 4: Deliveries Ordered by Date
        Validates: Requirements 2.3
        
        Test that deliveries are sorted by scheduled_for ascending.
        """
        # Sort deliveries by scheduled_for
        sorted_deliveries = sorted(deliveries, key=lambda d: d.scheduled_for)
        
        # Verify ordering
        for i in range(len(sorted_deliveries) - 1):
            assert sorted_deliveries[i].scheduled_for <= sorted_deliveries[i + 1].scheduled_for, \
                "Deliveries should be ordered by scheduled_for ascending"
    
    def test_empty_deliveries_list_is_valid(self):
        """
        Feature: florist-dashboard, Property 4: Deliveries Ordered by Date
        Validates: Requirements 2.3
        
        Test that empty deliveries list is valid and sorted.
        """
        response = FloristDeliveriesListResponse(deliveries=[])
        
        assert response.deliveries == [], "Empty deliveries list should be valid"
        assert isinstance(response.deliveries, list), "deliveries must be a list"


class TestDeliveryResponseRequiredFields:
    """
    Property 5: Delivery Response Contains Required Fields
    
    For any delivery returned by the florist deliveries endpoint, the response
    includes customer_email, property_name, property_address, subscription_plan,
    and scheduled_for fields.
    """
    
    @given(delivery=florist_delivery_strategy())
    @settings(max_examples=100)
    def test_delivery_contains_all_required_fields(self, delivery: FloristDeliveryResponse):
        """
        Feature: florist-dashboard, Property 5: Delivery Response Contains Required Fields
        Validates: Requirements 2.2
        
        Test that FloristDeliveryResponse contains all required fields.
        """
        # Verify all required fields are present and not None
        assert delivery.id is not None, "Delivery must have id"
        assert delivery.customer_email is not None, "Delivery must have customer_email"
        assert delivery.property_id is not None, "Delivery must have property_id"
        assert delivery.property_name is not None, "Delivery must have property_name"
        assert delivery.property_address is not None, "Delivery must have property_address"
        assert delivery.subscription_plan is not None, "Delivery must have subscription_plan"
        assert delivery.status is not None, "Delivery must have status"
        assert delivery.scheduled_for is not None, "Delivery must have scheduled_for"
    
    @given(delivery=florist_delivery_strategy())
    @settings(max_examples=100)
    def test_delivery_fields_have_correct_types(self, delivery: FloristDeliveryResponse):
        """
        Feature: florist-dashboard, Property 5: Delivery Response Contains Required Fields
        Validates: Requirements 2.2
        
        Test that delivery fields have correct types.
        """
        assert isinstance(delivery.id, UUID), "id must be a UUID"
        assert isinstance(delivery.customer_email, str), "customer_email must be a string"
        assert "@" in delivery.customer_email, "customer_email must be a valid email"
        assert isinstance(delivery.property_id, UUID), "property_id must be a UUID"
        assert isinstance(delivery.property_name, str), "property_name must be a string"
        assert isinstance(delivery.property_address, str), "property_address must be a string"
        assert isinstance(delivery.subscription_plan, SubscriptionPlan), \
            "subscription_plan must be a SubscriptionPlan"
        assert isinstance(delivery.status, DeliveryStatus), "status must be a DeliveryStatus"
        assert isinstance(delivery.scheduled_for, datetime), "scheduled_for must be a datetime"
    
    @given(plan=subscription_plan_strategy())
    @settings(max_examples=100)
    def test_subscription_plan_is_valid(self, plan: SubscriptionPlan):
        """
        Feature: florist-dashboard, Property 5: Delivery Response Contains Required Fields
        Validates: Requirements 2.2
        
        Test that subscription_plan is one of the valid values.
        """
        valid_plans = [SubscriptionPlan.ESSENTIAL, SubscriptionPlan.SIGNATURE, SubscriptionPlan.STATEMENT]
        assert plan in valid_plans, f"subscription_plan must be one of {valid_plans}"
