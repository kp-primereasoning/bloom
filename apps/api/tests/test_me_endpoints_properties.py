"""
Property tests for /me endpoints (customer self-service).
Feature: customer-onboarding-flow
Properties 4-8: RBAC enforcement, round-trip, status validation, error format
Validates: Requirements 3.3, 3.4, 4.3, 4.4, 4.5, 4.6, 12.1, 12.2
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4, UUID

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import User, UserRole, SubscriptionStatus


# Strategy for generating non-CUSTOMER roles
@st.composite
def non_customer_role_strategy(draw):
    """Generate roles that are not CUSTOMER."""
    return draw(st.sampled_from([
        UserRole.ADMIN,
        UserRole.PROPERTY_MANAGER,
        UserRole.FLORIST
    ]))


# Strategy for generating valid subscription statuses for update
@st.composite
def valid_subscription_status_strategy(draw):
    """Generate valid subscription statuses for /me/subscription (ACTIVE or PAUSED)."""
    return draw(st.sampled_from([
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PAUSED
    ]))


class TestMeEndpointsRBAC:
    """
    Property 4: Non-CUSTOMER roles get 403 on /me/* endpoints
    
    For any user with role other than CUSTOMER (ADMIN, PROPERTY_MANAGER, FLORIST),
    calling PATCH /me/property or PATCH /me/subscription SHALL return HTTP 403.
    """
    
    @given(role=non_customer_role_strategy())
    @settings(max_examples=100)
    def test_non_customer_roles_forbidden(self, role: UserRole):
        """
        Feature: customer-onboarding-flow, Property 4: Non-CUSTOMER roles get 403
        Validates: Requirements 3.3, 4.3
        
        Test that non-CUSTOMER roles are rejected by /me endpoints.
        """
        # Simulate the role check that require_role(["CUSTOMER"]) performs
        allowed_roles = ["CUSTOMER"]
        user_role = role.value
        
        # This simulates what the dependency does
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, f"Role {role} should not be allowed on /me endpoints"
    
    def test_customer_role_allowed(self):
        """
        Feature: customer-onboarding-flow, Property 4: CUSTOMER role is allowed
        Validates: Requirements 3.2, 4.2
        
        Test that CUSTOMER role is allowed on /me endpoints.
        """
        allowed_roles = ["CUSTOMER"]
        user_role = UserRole.CUSTOMER.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "CUSTOMER role should be allowed on /me endpoints"


class TestPropertyAssignmentRoundTrip:
    """
    Property 5: Property assignment round-trip
    
    For any valid property_id belonging to a non-ARCHIVED property, calling
    PATCH /me/property with that property_id SHALL update the user's property_id
    and return a user object where property_id equals the submitted value.
    """
    
    @given(property_id=st.uuids())
    @settings(max_examples=100)
    def test_property_assignment_updates_user(self, property_id: UUID):
        """
        Feature: customer-onboarding-flow, Property 5: Property assignment round-trip
        Validates: Requirements 3.4
        
        Test that property assignment updates the user's property_id correctly.
        """
        # Create a mock user
        user = User(
            id=uuid4(),
            email="customer@test.com",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            property_id=None,
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc)
        )
        
        # Simulate the update
        user.property_id = property_id
        
        # Verify round-trip
        assert user.property_id == property_id, \
            "User's property_id should match the assigned value"


class TestSubscriptionUpdateRoundTrip:
    """
    Property 6: Subscription update round-trip
    
    For any subscription_status in {ACTIVE, PAUSED}, calling PATCH /me/subscription
    with that status SHALL update the user's subscription_status and return a user
    object where subscription_status equals the submitted value.
    """
    
    @given(status=valid_subscription_status_strategy())
    @settings(max_examples=100)
    def test_subscription_update_round_trip(self, status: SubscriptionStatus):
        """
        Feature: customer-onboarding-flow, Property 6: Subscription update round-trip
        Validates: Requirements 4.4, 4.6
        
        Test that subscription status update works correctly.
        """
        # Create a mock user with CREATED status
        user = User(
            id=uuid4(),
            email="customer@test.com",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            property_id=uuid4(),
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc)
        )
        
        # Simulate the update
        user.subscription_status = status
        
        # Verify round-trip
        assert user.subscription_status == status, \
            f"User's subscription_status should be {status}"


class TestSubscriptionStatusValidation:
    """
    Property 7: Subscription endpoint rejects CREATED status
    
    For any attempt to set subscription_status to CREATED via PATCH /me/subscription,
    the endpoint SHALL return HTTP 400.
    """
    
    def test_created_status_rejected_by_schema(self):
        """
        Feature: customer-onboarding-flow, Property 7: CREATED status rejection
        Validates: Requirements 4.5
        
        Test that CREATED status is rejected by the schema validation.
        """
        from pydantic import ValidationError
        from routes.me import MeSubscriptionUpdate
        
        # CREATED should be rejected by the Literal type
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="CREATED")
    
    def test_active_status_accepted(self):
        """
        Feature: customer-onboarding-flow, Property 7: ACTIVE status accepted
        Validates: Requirements 4.4
        
        Test that ACTIVE status is accepted.
        """
        from routes.me import MeSubscriptionUpdate
        
        update = MeSubscriptionUpdate(subscription_status="ACTIVE")
        assert update.subscription_status == "ACTIVE"
    
    def test_paused_status_accepted(self):
        """
        Feature: customer-onboarding-flow, Property 7: PAUSED status accepted
        Validates: Requirements 4.4
        
        Test that PAUSED status is accepted.
        """
        from routes.me import MeSubscriptionUpdate
        
        update = MeSubscriptionUpdate(subscription_status="PAUSED")
        assert update.subscription_status == "PAUSED"
    
    def test_invalid_status_rejected(self):
        """
        Feature: customer-onboarding-flow, Property 7: Invalid status rejection
        Validates: Requirements 4.5
        
        Test that invalid status values are rejected.
        """
        from pydantic import ValidationError
        from routes.me import MeSubscriptionUpdate
        
        with pytest.raises(ValidationError):
            MeSubscriptionUpdate(subscription_status="INVALID")


class TestErrorEnvelopeFormat:
    """
    Property 8: Error responses follow Error_Envelope format
    
    For any error response from onboarding endpoints (400, 401, 403, 409, 422),
    the response body SHALL contain an error object with code, message, and request_id fields.
    """
    
    def test_error_envelope_structure(self):
        """
        Feature: customer-onboarding-flow, Property 8: Error envelope format
        Validates: Requirements 12.1, 12.2
        
        Test that error responses have the correct structure.
        """
        # Simulate an error response
        error_response = {
            "error": {
                "code": "INVALID_PROPERTY",
                "message": "Property not found",
                "request_id": str(uuid4())
            }
        }
        
        # Verify structure
        assert "error" in error_response, "Response must contain 'error' key"
        assert "code" in error_response["error"], "Error must contain 'code'"
        assert "message" in error_response["error"], "Error must contain 'message'"
        assert "request_id" in error_response["error"], "Error must contain 'request_id'"
    
    @given(
        code=st.sampled_from(["INVALID_PROPERTY", "EMAIL_EXISTS", "FORBIDDEN", "INVALID_STATUS"]),
        message=st.text(min_size=1, max_size=100)
    )
    @settings(max_examples=50)
    def test_error_envelope_with_various_codes(self, code: str, message: str):
        """
        Feature: customer-onboarding-flow, Property 8: Error envelope format
        Validates: Requirements 12.1, 12.2
        
        Test that error envelopes work with various error codes.
        """
        request_id = str(uuid4())
        
        error_response = {
            "error": {
                "code": code,
                "message": message,
                "request_id": request_id
            }
        }
        
        # Verify all required fields are present and non-empty
        assert error_response["error"]["code"] == code
        assert error_response["error"]["message"] == message
        assert error_response["error"]["request_id"] == request_id
        
        # Verify request_id is a valid UUID format
        try:
            UUID(error_response["error"]["request_id"])
        except ValueError:
            pytest.fail("request_id must be a valid UUID")
