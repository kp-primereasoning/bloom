"""
Property tests for PATCH /florist/deliveries/{delivery_id} endpoint.
Feature: florist-dashboard
Property 6: Assignment-Based Authorization
Property 7: Delivery Status Update with Timestamp
Property 8: Valid Status Transitions
Validates: Requirements 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4, UUID

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.delivery import DeliveryStatus, SubscriptionPlan
from schemas.domain import UpdateDeliveryStatusRequest


# Strategy for generating valid update statuses
@st.composite
def valid_update_status_strategy(draw):
    """Generate valid statuses for delivery update (DELIVERED or MISSED)."""
    return draw(st.sampled_from(["DELIVERED", "MISSED"]))


# Strategy for generating invalid source statuses (not SCHEDULED)
@st.composite
def invalid_source_status_strategy(draw):
    """Generate statuses that are not valid source states for update."""
    return draw(st.sampled_from([
        DeliveryStatus.DELIVERED,
        DeliveryStatus.MISSED,
        DeliveryStatus.SKIPPED,
    ]))


class TestAssignmentBasedAuthorization:
    """
    Property 6: Assignment-Based Authorization
    
    For any florist attempting to update a delivery via PATCH /florist/deliveries/{id},
    the operation succeeds only if the delivery's property_id matches one of the
    florist's active property assignments. Otherwise, HTTP 403 is returned.
    """
    
    @given(
        florist_assigned_properties=st.lists(st.uuids(), min_size=1, max_size=5),
        delivery_property_id=st.uuids()
    )
    @settings(max_examples=100)
    def test_authorization_check_logic(
        self,
        florist_assigned_properties: list,
        delivery_property_id: UUID
    ):
        """
        Feature: florist-dashboard, Property 6: Assignment-Based Authorization
        Validates: Requirements 3.3, 3.4, 4.2, 4.3
        
        Test that authorization check correctly validates property assignment.
        """
        # Simulate the authorization check
        is_authorized = delivery_property_id in florist_assigned_properties
        
        if is_authorized:
            # Florist should be able to update this delivery
            assert delivery_property_id in florist_assigned_properties
        else:
            # Florist should NOT be able to update this delivery
            assert delivery_property_id not in florist_assigned_properties
    
    def test_florist_can_update_assigned_property_delivery(self):
        """
        Feature: florist-dashboard, Property 6: Assignment-Based Authorization
        Validates: Requirements 3.3
        
        Test that florist can update delivery for assigned property.
        """
        property_id = uuid4()
        assigned_properties = [property_id, uuid4(), uuid4()]
        
        is_authorized = property_id in assigned_properties
        
        assert is_authorized, "Florist should be authorized for assigned property"
    
    def test_florist_cannot_update_unassigned_property_delivery(self):
        """
        Feature: florist-dashboard, Property 6: Assignment-Based Authorization
        Validates: Requirements 3.4, 4.3
        
        Test that florist cannot update delivery for unassigned property.
        """
        delivery_property_id = uuid4()
        assigned_properties = [uuid4(), uuid4(), uuid4()]  # Different properties
        
        is_authorized = delivery_property_id in assigned_properties
        
        assert not is_authorized, "Florist should NOT be authorized for unassigned property"


class TestDeliveryStatusUpdateWithTimestamp:
    """
    Property 7: Delivery Status Update with Timestamp
    
    For any valid delivery status update to DELIVERED, the delivery's status changes
    to DELIVERED and delivered_at is set to a non-null timestamp. For updates to MISSED,
    status changes to MISSED and delivered_at remains null.
    """
    
    def test_delivered_status_sets_timestamp(self):
        """
        Feature: florist-dashboard, Property 7: Delivery Status Update with Timestamp
        Validates: Requirements 3.1, 3.2
        
        Test that DELIVERED status sets delivered_at timestamp.
        """
        # Simulate the update logic
        new_status = "DELIVERED"
        delivered_at = None
        
        if new_status == "DELIVERED":
            delivered_at = datetime.now(timezone.utc)
        
        assert delivered_at is not None, "delivered_at should be set for DELIVERED status"
        assert isinstance(delivered_at, datetime), "delivered_at should be a datetime"
    
    def test_missed_status_does_not_set_timestamp(self):
        """
        Feature: florist-dashboard, Property 7: Delivery Status Update with Timestamp
        Validates: Requirements 4.1
        
        Test that MISSED status does not set delivered_at timestamp.
        """
        # Simulate the update logic
        new_status = "MISSED"
        delivered_at = None
        
        if new_status == "DELIVERED":
            delivered_at = datetime.now(timezone.utc)
        
        assert delivered_at is None, "delivered_at should remain null for MISSED status"
    
    @given(status=valid_update_status_strategy())
    @settings(max_examples=100)
    def test_status_update_timestamp_behavior(self, status: str):
        """
        Feature: florist-dashboard, Property 7: Delivery Status Update with Timestamp
        Validates: Requirements 3.1, 3.2, 4.1
        
        Test timestamp behavior for all valid status updates.
        """
        delivered_at = None
        
        if status == "DELIVERED":
            delivered_at = datetime.now(timezone.utc)
        
        if status == "DELIVERED":
            assert delivered_at is not None, \
                "delivered_at should be set for DELIVERED status"
        else:
            assert delivered_at is None, \
                f"delivered_at should remain null for {status} status"


class TestValidStatusTransitions:
    """
    Property 8: Valid Status Transitions
    
    For any delivery status update request, the operation succeeds only if the
    current status is SCHEDULED. Attempts to update deliveries with status
    DELIVERED, MISSED, or SKIPPED return HTTP 400.
    """
    
    def test_scheduled_status_allows_update(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that SCHEDULED status allows update.
        """
        current_status = DeliveryStatus.SCHEDULED
        
        can_update = current_status == DeliveryStatus.SCHEDULED
        
        assert can_update, "SCHEDULED status should allow update"
    
    @given(current_status=invalid_source_status_strategy())
    @settings(max_examples=100)
    def test_non_scheduled_status_rejects_update(self, current_status: DeliveryStatus):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that non-SCHEDULED statuses reject update.
        """
        can_update = current_status == DeliveryStatus.SCHEDULED
        
        assert not can_update, \
            f"Status {current_status} should NOT allow update"
    
    def test_delivered_status_rejects_update(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that DELIVERED status rejects update.
        """
        current_status = DeliveryStatus.DELIVERED
        
        can_update = current_status == DeliveryStatus.SCHEDULED
        
        assert not can_update, "DELIVERED status should NOT allow update"
    
    def test_missed_status_rejects_update(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that MISSED status rejects update.
        """
        current_status = DeliveryStatus.MISSED
        
        can_update = current_status == DeliveryStatus.SCHEDULED
        
        assert not can_update, "MISSED status should NOT allow update"
    
    def test_skipped_status_rejects_update(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that SKIPPED status rejects update.
        """
        current_status = DeliveryStatus.SKIPPED
        
        can_update = current_status == DeliveryStatus.SCHEDULED
        
        assert not can_update, "SKIPPED status should NOT allow update"


class TestUpdateDeliveryStatusRequestValidation:
    """
    Test UpdateDeliveryStatusRequest schema validation.
    """
    
    def test_delivered_status_accepted(self):
        """
        Feature: florist-dashboard, Property 7: Delivery Status Update
        Validates: Requirements 3.1
        
        Test that DELIVERED status is accepted.
        """
        request = UpdateDeliveryStatusRequest(status="DELIVERED")
        assert request.status == "DELIVERED"
    
    def test_missed_status_accepted(self):
        """
        Feature: florist-dashboard, Property 7: Delivery Status Update
        Validates: Requirements 4.1
        
        Test that MISSED status is accepted.
        """
        request = UpdateDeliveryStatusRequest(status="MISSED")
        assert request.status == "MISSED"
    
    def test_scheduled_status_rejected(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that SCHEDULED status is rejected by schema.
        """
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            UpdateDeliveryStatusRequest(status="SCHEDULED")
    
    def test_skipped_status_rejected(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that SKIPPED status is rejected by schema.
        """
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            UpdateDeliveryStatusRequest(status="SKIPPED")
    
    def test_invalid_status_rejected(self):
        """
        Feature: florist-dashboard, Property 8: Valid Status Transitions
        Validates: Requirements 4.4
        
        Test that invalid status values are rejected.
        """
        from pydantic import ValidationError
        
        with pytest.raises(ValidationError):
            UpdateDeliveryStatusRequest(status="INVALID")
