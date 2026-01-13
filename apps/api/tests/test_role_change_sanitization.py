"""
Property test for role change field sanitization.
Feature: admin-users-enhanced, Property 5: Role Change Field Sanitization
Validates: Requirements 4.3, 6.3

When a user's role is changed:
- If new role != PROPERTY_MANAGER, property_id SHALL be cleared to null
- If new role != CUSTOMER, subscription_status SHALL be cleared (returned as null)
- If new role == CUSTOMER, subscription_status SHALL be set to CREATED
"""

import os
import sys
from uuid import uuid4
from datetime import datetime, timezone

import pytest
from hypothesis import given, settings, strategies as st
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.user import UserRole, User, SubscriptionStatus
from db.users import clear_users
from auth.service import auth_service


# Test client
client = TestClient(app)


def get_admin_token():
    """Get a valid admin JWT token for testing."""
    admin_user = User(
        id=uuid4(),
        email="admin@test.com",
        hashed_password="hashed",
        role=UserRole.ADMIN,
        subscription_status=SubscriptionStatus.CREATED,
        created_at=datetime.now(timezone.utc)
    )
    return auth_service.create_access_token(admin_user)


def get_admin_headers():
    """Get headers with admin authentication."""
    return {"Authorization": f"Bearer {get_admin_token()}"}


# Strategies
all_roles = st.sampled_from([
    UserRole.CUSTOMER.value,
    UserRole.PROPERTY_MANAGER.value,
    UserRole.FLORIST.value,
    UserRole.ADMIN.value
])

non_customer_roles = st.sampled_from([
    UserRole.PROPERTY_MANAGER.value,
    UserRole.FLORIST.value,
    UserRole.ADMIN.value
])

non_pm_roles = st.sampled_from([
    UserRole.CUSTOMER.value,
    UserRole.FLORIST.value,
    UserRole.ADMIN.value
])


class TestRoleChangeSanitization:
    """
    Property 5: Role Change Field Sanitization
    
    Tests that fields are properly sanitized when role changes.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    @given(new_role=non_pm_roles)
    @settings(max_examples=10, deadline=None)
    def test_property_id_cleared_when_role_changes_from_pm(self, new_role: str):
        """
        When a PROPERTY_MANAGER's role is changed to non-PM,
        property_id should be cleared.
        """
        clear_users()
        
        # Create a property first
        prop_response = client.post(
            "/admin/properties",
            json={"name": f"Prop_{uuid4().hex[:8]}", "address": "123 Test St"},
            headers=get_admin_headers()
        )
        property_id = prop_response.json()["id"]
        
        # Create PM with property_id
        email = f"pm_{uuid4().hex[:8]}@test.com"
        pm_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": property_id
            },
            headers=get_admin_headers()
        )
        assert pm_response.status_code == 201
        pm_id = pm_response.json()["id"]
        assert pm_response.json()["property_id"] == property_id
        
        # Change role to non-PM
        update_response = client.patch(
            f"/admin/users/{pm_id}",
            json={"role": new_role},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # property_id should be cleared
        updated_user = update_response.json()
        assert updated_user["property_id"] is None, \
            f"property_id should be null after role change to {new_role}, got {updated_user['property_id']}"
    
    @given(new_role=non_customer_roles)
    @settings(max_examples=10, deadline=None)
    def test_subscription_status_null_when_role_changes_from_customer(self, new_role: str):
        """
        When a CUSTOMER's role is changed to non-CUSTOMER,
        subscription_status should be returned as null.
        """
        clear_users()
        
        # Create CUSTOMER with subscription_status
        email = f"customer_{uuid4().hex[:8]}@test.com"
        customer_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert customer_response.status_code == 201
        customer_id = customer_response.json()["id"]
        assert customer_response.json()["subscription_status"] == "CREATED"
        
        # Change role to non-CUSTOMER
        update_response = client.patch(
            f"/admin/users/{customer_id}",
            json={"role": new_role},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # subscription_status should be null in response
        updated_user = update_response.json()
        assert updated_user["subscription_status"] is None, \
            f"subscription_status should be null after role change to {new_role}, got {updated_user['subscription_status']}"
    
    def test_subscription_status_set_to_created_when_role_changes_to_customer(self):
        """
        When a non-CUSTOMER's role is changed to CUSTOMER,
        subscription_status should be set to CREATED.
        """
        # Create FLORIST
        email = f"florist_{uuid4().hex[:8]}@test.com"
        florist_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "FLORIST",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert florist_response.status_code == 201
        florist_id = florist_response.json()["id"]
        assert florist_response.json()["subscription_status"] is None
        
        # Change role to CUSTOMER
        update_response = client.patch(
            f"/admin/users/{florist_id}",
            json={"role": "CUSTOMER"},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # subscription_status should be CREATED
        updated_user = update_response.json()
        assert updated_user["subscription_status"] == "CREATED", \
            f"subscription_status should be CREATED after role change to CUSTOMER, got {updated_user['subscription_status']}"


class TestRoleChangeSanitizationExamples:
    """Example-based tests for role change sanitization."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_pm_to_admin_clears_property_id(self):
        """PM to ADMIN should clear property_id."""
        # Create property
        prop_response = client.post(
            "/admin/properties",
            json={"name": "Test Prop", "address": "123 St"},
            headers=get_admin_headers()
        )
        property_id = prop_response.json()["id"]
        
        # Create PM with property
        pm_response = client.post(
            "/admin/users",
            json={
                "email": "pm@example.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": property_id
            },
            headers=get_admin_headers()
        )
        pm_id = pm_response.json()["id"]
        
        # Change to ADMIN
        update_response = client.patch(
            f"/admin/users/{pm_id}",
            json={"role": "ADMIN"},
            headers=get_admin_headers()
        )
        
        assert update_response.json()["property_id"] is None
        assert update_response.json()["subscription_status"] is None
    
    def test_customer_to_florist_clears_subscription_status(self):
        """CUSTOMER to FLORIST should clear subscription_status."""
        # Create CUSTOMER
        customer_response = client.post(
            "/admin/users",
            json={
                "email": "customer@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        customer_id = customer_response.json()["id"]
        
        # Update subscription status to ACTIVE
        client.patch(
            f"/admin/users/{customer_id}",
            json={"subscription_status": "ACTIVE"},
            headers=get_admin_headers()
        )
        
        # Change to FLORIST
        update_response = client.patch(
            f"/admin/users/{customer_id}",
            json={"role": "FLORIST"},
            headers=get_admin_headers()
        )
        
        assert update_response.json()["subscription_status"] is None
    
    def test_admin_to_customer_sets_subscription_status_created(self):
        """ADMIN to CUSTOMER should set subscription_status to CREATED."""
        # Create ADMIN
        admin_response = client.post(
            "/admin/users",
            json={
                "email": "newadmin@example.com",
                "role": "ADMIN",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        admin_id = admin_response.json()["id"]
        
        # Change to CUSTOMER
        update_response = client.patch(
            f"/admin/users/{admin_id}",
            json={"role": "CUSTOMER"},
            headers=get_admin_headers()
        )
        
        assert update_response.json()["subscription_status"] == "CREATED"
