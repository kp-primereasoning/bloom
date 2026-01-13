"""
Property tests for user subscription status behavior.
Feature: admin-users-enhanced, Properties 2 & 3
Validates: Requirements 1.2, 1.3, 3.5

Property 2: CUSTOMER Subscription Status Default
For any user created with role = CUSTOMER, the subscription_status SHALL be CREATED.

Property 3: Non-CUSTOMER Subscription Status Null
For any user created with role ≠ CUSTOMER, the subscription_status SHALL be null.
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
non_customer_roles = st.sampled_from([
    UserRole.PROPERTY_MANAGER.value,
    UserRole.FLORIST.value,
    UserRole.ADMIN.value
])


class TestCustomerSubscriptionStatusDefault:
    """
    Property 2: CUSTOMER Subscription Status Default
    
    For any user created with role = CUSTOMER, the subscription_status
    SHALL be CREATED in the creation response and in subsequent GET requests.
    """
    
    @given(st.just("CUSTOMER"))
    @settings(max_examples=5, deadline=None)
    def test_customer_subscription_status_is_created(self, role: str):
        """Test that CUSTOMER users always get subscription_status = CREATED."""
        clear_users()
        
        email = f"customer_{uuid4().hex[:8]}@test.com"
        
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        user = response.json()
        
        # Verify subscription_status is CREATED
        assert user["subscription_status"] == "CREATED", \
            f"CUSTOMER user should have subscription_status=CREATED, got {user['subscription_status']}"
        
        # Verify in GET response
        list_response = client.get("/admin/users", headers=get_admin_headers())
        users = list_response.json()
        found = next((u for u in users if u["email"].lower() == email.lower()), None)
        
        assert found is not None
        assert found["subscription_status"] == "CREATED"


class TestNonCustomerSubscriptionStatusNull:
    """
    Property 3: Non-CUSTOMER Subscription Status Null
    
    For any user created with role ≠ CUSTOMER, the subscription_status
    SHALL be null in the creation response and in subsequent GET requests.
    """
    
    @given(role=non_customer_roles)
    @settings(max_examples=10, deadline=None)
    def test_non_customer_subscription_status_is_null(self, role: str):
        """Test that non-CUSTOMER users always get subscription_status = null."""
        clear_users()
        
        email = f"user_{uuid4().hex[:8]}@test.com"
        
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        user = response.json()
        
        # Verify subscription_status is null
        assert user["subscription_status"] is None, \
            f"{role} user should have subscription_status=null, got {user['subscription_status']}"
        
        # Verify in GET response
        list_response = client.get("/admin/users", headers=get_admin_headers())
        users = list_response.json()
        found = next((u for u in users if u["email"].lower() == email.lower()), None)
        
        assert found is not None
        assert found["subscription_status"] is None


class TestSubscriptionStatusExamples:
    """Example-based tests for subscription status behavior."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_customer_gets_created_status(self):
        """CUSTOMER user should have subscription_status = CREATED."""
        response = client.post(
            "/admin/users",
            json={
                "email": "customer@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        assert response.json()["subscription_status"] == "CREATED"
    
    def test_property_manager_gets_null_status(self):
        """PROPERTY_MANAGER user should have subscription_status = null."""
        response = client.post(
            "/admin/users",
            json={
                "email": "pm@example.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        assert response.json()["subscription_status"] is None
    
    def test_florist_gets_null_status(self):
        """FLORIST user should have subscription_status = null."""
        response = client.post(
            "/admin/users",
            json={
                "email": "florist@example.com",
                "role": "FLORIST",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        assert response.json()["subscription_status"] is None
    
    def test_admin_gets_null_status(self):
        """ADMIN user should have subscription_status = null."""
        response = client.post(
            "/admin/users",
            json={
                "email": "newadmin@example.com",
                "role": "ADMIN",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        assert response.json()["subscription_status"] is None
