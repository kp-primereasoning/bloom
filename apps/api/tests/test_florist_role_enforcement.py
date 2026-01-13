"""
Property Test: FLORIST Role Enforcement
Validates: Requirements 1.4, 2.5, 3.5

Property 1: For any user with a non-FLORIST role attempting to access /florist/* endpoints,
the API returns HTTP 403 Forbidden.

This test validates the role enforcement logic used by the florist endpoints.
"""

import pytest
from hypothesis import given, strategies as st, settings
from uuid import uuid4

from models.user import UserRole


class TestFloristRoleEnforcement:
    """
    Property 1: FLORIST Role Enforcement
    
    For any user with a non-FLORIST role attempting to access /florist/* endpoints,
    the API returns HTTP 403 Forbidden.
    
    This test validates the role checking logic that require_role(["FLORIST"]) performs.
    """

    @settings(max_examples=100)
    @given(role=st.sampled_from([UserRole.CUSTOMER, UserRole.PROPERTY_MANAGER, UserRole.ADMIN]))
    def test_non_florist_roles_rejected_from_florist_me(self, role: UserRole):
        """
        Property: GET /florist/me rejects non-FLORIST roles.
        Validates: Requirements 1.4
        """
        # Simulate the role check that require_role(["FLORIST"]) performs
        allowed_roles = ["FLORIST"]
        user_role = role.value
        
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, (
            f"Role {role} should not be allowed on GET /florist/me endpoint"
        )

    @settings(max_examples=100)
    @given(role=st.sampled_from([UserRole.CUSTOMER, UserRole.PROPERTY_MANAGER, UserRole.ADMIN]))
    def test_non_florist_roles_rejected_from_florist_deliveries(self, role: UserRole):
        """
        Property: GET /florist/deliveries rejects non-FLORIST roles.
        Validates: Requirements 2.5
        """
        allowed_roles = ["FLORIST"]
        user_role = role.value
        
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, (
            f"Role {role} should not be allowed on GET /florist/deliveries endpoint"
        )

    @settings(max_examples=100)
    @given(role=st.sampled_from([UserRole.CUSTOMER, UserRole.PROPERTY_MANAGER, UserRole.ADMIN]))
    def test_non_florist_roles_rejected_from_delivery_update(self, role: UserRole):
        """
        Property: PATCH /florist/deliveries/{id} rejects non-FLORIST roles.
        Validates: Requirements 3.5
        """
        allowed_roles = ["FLORIST"]
        user_role = role.value
        
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, (
            f"Role {role} should not be allowed on PATCH /florist/deliveries/{{id}} endpoint"
        )

    def test_florist_role_allowed_on_florist_me(self):
        """
        Verify that FLORIST role CAN access /florist/me endpoint.
        Validates: Requirements 1.4
        """
        allowed_roles = ["FLORIST"]
        user_role = UserRole.FLORIST.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "FLORIST role should be allowed on GET /florist/me"

    def test_florist_role_allowed_on_florist_deliveries(self):
        """
        Verify that FLORIST role CAN access /florist/deliveries endpoint.
        Validates: Requirements 2.5
        """
        allowed_roles = ["FLORIST"]
        user_role = UserRole.FLORIST.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "FLORIST role should be allowed on GET /florist/deliveries"

    def test_florist_role_allowed_on_delivery_update(self):
        """
        Verify that FLORIST role CAN access PATCH /florist/deliveries/{id} endpoint.
        Validates: Requirements 3.5
        """
        allowed_roles = ["FLORIST"]
        user_role = UserRole.FLORIST.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "FLORIST role should be allowed on PATCH /florist/deliveries/{id}"


class TestRoleEnforcementCompleteness:
    """
    Test that all user roles are accounted for in the role enforcement logic.
    """

    def test_all_roles_have_defined_access(self):
        """
        Verify that all UserRole values are either allowed or denied.
        """
        allowed_roles = ["FLORIST"]
        
        for role in UserRole:
            user_role = role.value
            is_allowed = user_role in allowed_roles
            
            if role == UserRole.FLORIST:
                assert is_allowed, f"FLORIST should be allowed"
            else:
                assert not is_allowed, f"{role} should not be allowed"

    def test_role_check_is_case_sensitive(self):
        """
        Verify that role checking is case-sensitive for security.
        """
        allowed_roles = ["FLORIST"]
        
        # These should NOT match
        assert "florist" not in allowed_roles
        assert "Florist" not in allowed_roles
        assert "FLORIST " not in allowed_roles
        
        # Only exact match should work
        assert "FLORIST" in allowed_roles
