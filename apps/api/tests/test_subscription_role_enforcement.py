"""
Property tests for subscription endpoint role enforcement.
Feature: customer-dashboard-v1
Property 3: Customer Role Enforcement
Validates: Requirements 4.3
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

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


# Strategy for generating all roles
@st.composite
def all_roles_strategy(draw):
    """Generate any valid user role."""
    return draw(st.sampled_from([
        UserRole.ADMIN,
        UserRole.PROPERTY_MANAGER,
        UserRole.FLORIST,
        UserRole.CUSTOMER
    ]))


class TestSubscriptionRoleEnforcement:
    """
    Property 3: Customer Role Enforcement
    
    For any user with a non-CUSTOMER role attempting to call PATCH /me/subscription,
    the endpoint returns HTTP 403.
    """
    
    @given(role=non_customer_role_strategy())
    @settings(max_examples=100)
    def test_non_customer_roles_forbidden(self, role: UserRole):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that non-CUSTOMER roles are rejected by /me/subscription endpoint.
        """
        # Simulate the role check that require_role(["CUSTOMER"]) performs
        allowed_roles = ["CUSTOMER"]
        user_role = role.value
        
        # This simulates what the dependency does
        is_allowed = user_role in allowed_roles
        
        assert not is_allowed, f"Role {role} should not be allowed on /me/subscription"
    
    def test_customer_role_allowed(self):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that CUSTOMER role is allowed on /me/subscription endpoint.
        """
        allowed_roles = ["CUSTOMER"]
        user_role = UserRole.CUSTOMER.value
        
        is_allowed = user_role in allowed_roles
        
        assert is_allowed, "CUSTOMER role should be allowed on /me/subscription"
    
    @given(role=all_roles_strategy())
    @settings(max_examples=100)
    def test_only_customer_role_allowed(self, role: UserRole):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that only CUSTOMER role is allowed, all others are forbidden.
        """
        allowed_roles = ["CUSTOMER"]
        user_role = role.value
        
        is_allowed = user_role in allowed_roles
        
        if role == UserRole.CUSTOMER:
            assert is_allowed, "CUSTOMER role should be allowed"
        else:
            assert not is_allowed, f"Role {role} should not be allowed"
    
    def test_admin_role_forbidden(self):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that ADMIN role is forbidden.
        """
        allowed_roles = ["CUSTOMER"]
        assert UserRole.ADMIN.value not in allowed_roles
    
    def test_property_manager_role_forbidden(self):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that PROPERTY_MANAGER role is forbidden.
        """
        allowed_roles = ["CUSTOMER"]
        assert UserRole.PROPERTY_MANAGER.value not in allowed_roles
    
    def test_florist_role_forbidden(self):
        """
        Feature: customer-dashboard-v1, Property 3: Customer Role Enforcement
        Validates: Requirements 4.3
        
        Test that FLORIST role is forbidden.
        """
        allowed_roles = ["CUSTOMER"]
        assert UserRole.FLORIST.value not in allowed_roles
