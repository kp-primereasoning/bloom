"""
Property test for property_id role validation.
Feature: admin-users-enhanced, Property 4: Property ID Role Validation
Validates: Requirements 1.4, 3.3, 3.4, 4.5

For any user creation or update request:
- If role = PROPERTY_MANAGER, property_id MAY be a valid Property UUID or null
- If role ≠ PROPERTY_MANAGER and property_id is provided, the API SHALL return 400
- If property_id references a non-existent Property, the API SHALL return 400
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
non_pm_roles = st.sampled_from([
    UserRole.CUSTOMER.value,
    UserRole.FLORIST.value,
    UserRole.ADMIN.value
])


class TestPropertyIdRoleValidation:
    """
    Property 4: Property ID Role Validation
    
    Tests that property_id is only valid for PROPERTY_MANAGER role.
    """
    
    @given(role=non_pm_roles)
    @settings(max_examples=10, deadline=None)
    def test_non_pm_with_property_id_rejected(self, role: str):
        """
        Test that non-PROPERTY_MANAGER users cannot have property_id.
        """
        clear_users()
        
        email = f"user_{uuid4().hex[:8]}@test.com"
        fake_property_id = str(uuid4())
        
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": "password123",
                "property_id": fake_property_id
            },
            headers=get_admin_headers()
        )
        
        # Should be rejected with 400
        assert response.status_code == 400, \
            f"Expected 400 for {role} with property_id, got {response.status_code}: {response.text}"
        # Check error message contains property_id reference
        error_text = response.text.lower()
        assert "property" in error_text, f"Error should mention property: {response.text}"
    
    def test_pm_with_invalid_property_id_rejected(self):
        """
        Test that PROPERTY_MANAGER with non-existent property_id is rejected.
        """
        clear_users()
        
        email = f"pm_{uuid4().hex[:8]}@test.com"
        fake_property_id = str(uuid4())  # Non-existent property
        
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": fake_property_id
            },
            headers=get_admin_headers()
        )
        
        # Should be rejected with 400
        assert response.status_code == 400, \
            f"Expected 400 for PM with invalid property_id, got {response.status_code}: {response.text}"
        error_text = response.text.lower()
        assert "property" in error_text, f"Error should mention property: {response.text}"
    
    def test_pm_without_property_id_allowed(self):
        """
        Test that PROPERTY_MANAGER without property_id is allowed.
        """
        clear_users()
        
        email = f"pm_{uuid4().hex[:8]}@test.com"
        
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "PROPERTY_MANAGER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 201
        user = response.json()
        assert user["property_id"] is None


class TestPropertyIdValidationExamples:
    """Example-based tests for property_id validation."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_customer_with_property_id_rejected(self):
        """CUSTOMER with property_id should be rejected."""
        response = client.post(
            "/admin/users",
            json={
                "email": "customer@example.com",
                "role": "CUSTOMER",
                "password": "password123",
                "property_id": str(uuid4())
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
    
    def test_florist_with_property_id_rejected(self):
        """FLORIST with property_id should be rejected."""
        response = client.post(
            "/admin/users",
            json={
                "email": "florist@example.com",
                "role": "FLORIST",
                "password": "password123",
                "property_id": str(uuid4())
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
    
    def test_admin_with_property_id_rejected(self):
        """ADMIN with property_id should be rejected."""
        response = client.post(
            "/admin/users",
            json={
                "email": "newadmin@example.com",
                "role": "ADMIN",
                "password": "password123",
                "property_id": str(uuid4())
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
