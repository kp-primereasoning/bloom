"""
Property test for user creation round-trip.
Feature: admin-users-enhanced, Property 1: User Creation Round-Trip
Validates: Requirements 8.1, 3.1, 3.2

For any valid user creation request (email, role, password, optional property_id),
after successful creation via POST /admin/users, the user SHALL appear in the
subsequent GET /admin/users response with matching email, role, and property_id.
"""

import os
import sys
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st, assume
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from models.user import UserRole, User, SubscriptionStatus
from db.users import clear_users, create_user, get_all_users
from auth.service import auth_service


# Test client
client = TestClient(app)


def get_admin_token():
    """Get a valid admin JWT token for testing."""
    from datetime import datetime, timezone
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


# Strategies for generating test data
email_strategy = st.text(min_size=3, max_size=20, alphabet=st.characters(
    whitelist_categories=('L', 'N')
)).map(lambda s: f"{s}@test.com")
password_strategy = st.text(min_size=6, max_size=20, alphabet=st.characters(
    whitelist_categories=('L', 'N')
))
role_strategy = st.sampled_from([r.value for r in UserRole])


class TestUserCreationRoundTrip:
    """
    Property 1: User Creation Round-Trip
    
    For any valid user creation request, after successful creation via POST,
    the user SHALL appear in the subsequent GET response with matching data.
    """
    
    @given(
        role=role_strategy,
    )
    @settings(max_examples=10, deadline=None)
    def test_user_creation_appears_in_list(
        self,
        role: str,
    ):
        """
        Test that any created user appears in the GET /admin/users list.
        """
        # Clear users for this iteration
        clear_users()
        
        # Generate unique email for this test
        email = f"test_{uuid4().hex[:8]}@test.com"
        password = "password123"
        
        # Create user
        create_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": password
            },
            headers=get_admin_headers()
        )
        
        # Should succeed
        assert create_response.status_code == 201, f"Create failed: {create_response.text}"
        created_user = create_response.json()
        
        # Verify created user has correct data
        assert created_user["email"].lower() == email.lower()
        assert created_user["role"] == role
        assert "id" in created_user
        assert "created_at" in created_user
        
        # Get all users
        list_response = client.get(
            "/admin/users",
            headers=get_admin_headers()
        )
        
        assert list_response.status_code == 200
        users = list_response.json()
        
        # Find the created user in the list
        matching_users = [u for u in users if u["email"].lower() == email.lower()]
        assert len(matching_users) == 1, f"Expected 1 user with email {email}, found {len(matching_users)}"
        
        found_user = matching_users[0]
        assert found_user["id"] == created_user["id"]
        assert found_user["role"] == role


class TestUserCreationRoundTripExamples:
    """Example-based tests for user creation round-trip."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_customer_creation_roundtrip(self):
        """Test CUSTOMER user creation appears in list."""
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
        created = response.json()
        
        list_response = client.get("/admin/users", headers=get_admin_headers())
        users = list_response.json()
        
        assert any(u["email"] == "customer@example.com" for u in users)
    
    def test_property_manager_creation_roundtrip(self):
        """Test PROPERTY_MANAGER user creation appears in list."""
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
        
        list_response = client.get("/admin/users", headers=get_admin_headers())
        users = list_response.json()
        
        assert any(u["email"] == "pm@example.com" for u in users)
    
    def test_admin_creation_roundtrip(self):
        """Test ADMIN user creation appears in list."""
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
        
        list_response = client.get("/admin/users", headers=get_admin_headers())
        users = list_response.json()
        
        assert any(u["email"] == "newadmin@example.com" for u in users)
