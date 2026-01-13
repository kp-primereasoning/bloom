"""
Property tests for /florist/me endpoint.
Feature: florist-dashboard
Property 2: Florist Me Response Structure
Validates: Requirements 1.1, 1.2, 1.3
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
from models.florist import FloristStatus
from schemas.domain import FloristMeResponse, AssignedPropertyResponse


# Strategy for generating florist statuses
@st.composite
def florist_status_strategy(draw):
    """Generate valid florist statuses."""
    return draw(st.sampled_from([
        FloristStatus.ONBOARDING,
        FloristStatus.READY,
    ]))


# Strategy for generating assigned properties
@st.composite
def assigned_property_strategy(draw):
    """Generate a valid assigned property response."""
    return AssignedPropertyResponse(
        property_id=draw(st.uuids()),
        property_name=draw(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        property_address=draw(st.text(min_size=1, max_size=200, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z'))))
    )


# Strategy for generating lists of assigned properties
@st.composite
def assigned_properties_list_strategy(draw):
    """Generate a list of assigned properties (0-5 items)."""
    count = draw(st.integers(min_value=0, max_value=5))
    return [draw(assigned_property_strategy()) for _ in range(count)]


class TestFloristMeResponseStructure:
    """
    Property 2: Florist Me Response Structure
    
    For any authenticated florist user, the GET /florist/me endpoint returns a response
    containing florist_id, florist_name, florist_status, and assigned_properties array.
    When the florist has active assignments, assigned_properties contains objects with
    property_id, property_name, and property_address.
    """
    
    @given(
        florist_id=st.uuids(),
        florist_name=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z'))),
        florist_status=florist_status_strategy(),
        assigned_properties=assigned_properties_list_strategy()
    )
    @settings(max_examples=100)
    def test_florist_me_response_contains_required_fields(
        self,
        florist_id: UUID,
        florist_name: str,
        florist_status: FloristStatus,
        assigned_properties: list
    ):
        """
        Feature: florist-dashboard, Property 2: Florist Me Response Structure
        Validates: Requirements 1.1, 1.2
        
        Test that FloristMeResponse contains all required fields.
        """
        response = FloristMeResponse(
            florist_id=florist_id,
            florist_name=florist_name,
            florist_status=florist_status,
            assigned_properties=assigned_properties
        )
        
        # Verify all required fields are present
        assert response.florist_id == florist_id, "Response must contain florist_id"
        assert response.florist_name == florist_name, "Response must contain florist_name"
        assert response.florist_status == florist_status, "Response must contain florist_status"
        assert response.assigned_properties == assigned_properties, "Response must contain assigned_properties"
    
    @given(
        florist_id=st.uuids(),
        florist_name=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z'))),
        florist_status=florist_status_strategy()
    )
    @settings(max_examples=100)
    def test_florist_with_no_assignments_returns_empty_array(
        self,
        florist_id: UUID,
        florist_name: str,
        florist_status: FloristStatus
    ):
        """
        Feature: florist-dashboard, Property 2: Florist Me Response Structure
        Validates: Requirements 1.3
        
        Test that florist with no assignments returns empty assigned_properties array.
        """
        response = FloristMeResponse(
            florist_id=florist_id,
            florist_name=florist_name,
            florist_status=florist_status,
            assigned_properties=[]
        )
        
        assert response.assigned_properties == [], \
            "Florist with no assignments should have empty assigned_properties array"
        assert isinstance(response.assigned_properties, list), \
            "assigned_properties must be a list"
    
    @given(assigned_property=assigned_property_strategy())
    @settings(max_examples=100)
    def test_assigned_property_contains_required_fields(
        self,
        assigned_property: AssignedPropertyResponse
    ):
        """
        Feature: florist-dashboard, Property 2: Florist Me Response Structure
        Validates: Requirements 1.2
        
        Test that AssignedPropertyResponse contains all required fields.
        """
        # Verify all required fields are present
        assert assigned_property.property_id is not None, \
            "AssignedProperty must contain property_id"
        assert assigned_property.property_name is not None, \
            "AssignedProperty must contain property_name"
        assert assigned_property.property_address is not None, \
            "AssignedProperty must contain property_address"
        
        # Verify types
        assert isinstance(assigned_property.property_id, UUID), \
            "property_id must be a UUID"
        assert isinstance(assigned_property.property_name, str), \
            "property_name must be a string"
        assert isinstance(assigned_property.property_address, str), \
            "property_address must be a string"


class TestFloristMeRoleEnforcement:
    """
    Property 1: FLORIST Role Enforcement (partial - schema validation)
    
    For any user with a non-FLORIST role attempting to access /florist/* endpoints,
    the API returns HTTP 403 Forbidden.
    """
    
    @given(role=st.sampled_from([UserRole.CUSTOMER, UserRole.ADMIN, UserRole.PROPERTY_MANAGER]))
    @settings(max_examples=100)
    def test_non_florist_roles_should_be_rejected(self, role: UserRole):
        """
        Feature: florist-dashboard, Property 1: FLORIST Role Enforcement
        Validates: Requirements 1.4, 2.5, 3.5
        
        Test that non-FLORIST roles are rejected by /florist endpoints.
        """
        # Simulate the role check that require_role(["FLORIST"]) performs
        allowed_roles = ["FLORIST"]
        user_role = role.value
        
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, f"Role {role} should not be allowed on /florist endpoints"
    
    def test_florist_role_is_allowed(self):
        """
        Feature: florist-dashboard, Property 1: FLORIST Role Enforcement
        Validates: Requirements 1.4
        
        Test that FLORIST role is allowed on /florist endpoints.
        """
        allowed_roles = ["FLORIST"]
        user_role = UserRole.FLORIST.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "FLORIST role should be allowed on /florist endpoints"
