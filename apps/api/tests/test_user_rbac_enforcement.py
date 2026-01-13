"""
Property test for RBAC enforcement on user endpoints.
Feature: admin-users-enhanced, Property 8: RBAC Enforcement
Validates: Requirements 2.3, 3.7, 4.6, 7.2, 7.3, 8.5

All user management endpoints SHALL require ADMIN role:
- GET /admin/users - 401 without auth, 403 without ADMIN role
- POST /admin/users - 401 without auth, 403 without ADMIN role
- PATCH /admin/users/{id} - 401 without auth, 403 without ADMIN role
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


def get_token_for_role(role: UserRole):
    """Get a valid JWT token for a specific role."""
    user = User(
        id=uuid4(),
        email=f"{role.value.lower()}@test.com",
        hashed_password="hashed",
        role=role,
        subscription_status=SubscriptionStatus.CREATED,
        created_at=datetime.now(timezone.utc)
    )
    return auth_service.create_access_token(user)


def get_headers_for_role(role: UserRole):
    """Get headers with authentication for a specific role."""
    return {"Authorization": f"Bearer {get_token_for_role(role)}"}


# Strategies
non_admin_roles = st.sampled_from([
    UserRole.CUSTOMER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FLORIST
])


class TestRBACEnforcement:
    """
    Property 8: RBAC Enforcement
    
    Tests that all user endpoints require ADMIN role.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    # =========================================================================
    # GET /admin/users
    # =========================================================================
    
    def test_get_users_without_auth_returns_401(self):
        """GET /admin/users without auth should return 401."""
        response = client.get("/admin/users")
        assert response.status_code == 401
    
    @given(role=non_admin_roles)
    @settings(max_examples=10, deadline=None)
    def test_get_users_without_admin_role_returns_403(self, role: UserRole):
        """GET /admin/users with non-ADMIN role should return 403."""
        response = client.get(
            "/admin/users",
            headers=get_headers_for_role(role)
        )
        assert response.status_code == 403, \
            f"Expected 403 for {role.value}, got {response.status_code}"
    
    def test_get_users_with_admin_role_returns_200(self):
        """GET /admin/users with ADMIN role should return 200."""
        response = client.get(
            "/admin/users",
            headers=get_admin_headers()
        )
        assert response.status_code == 200
    
    # =========================================================================
    # POST /admin/users
    # =========================================================================
    
    def test_create_user_without_auth_returns_401(self):
        """POST /admin/users without auth should return 401."""
        response = client.post(
            "/admin/users",
            json={
                "email": "test@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            }
        )
        assert response.status_code == 401
    
    @given(role=non_admin_roles)
    @settings(max_examples=10, deadline=None)
    def test_create_user_without_admin_role_returns_403(self, role: UserRole):
        """POST /admin/users with non-ADMIN role should return 403."""
        response = client.post(
            "/admin/users",
            json={
                "email": f"test_{uuid4().hex[:8]}@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_headers_for_role(role)
        )
        assert response.status_code == 403, \
            f"Expected 403 for {role.value}, got {response.status_code}"
    
    def test_create_user_with_admin_role_returns_201(self):
        """POST /admin/users with ADMIN role should return 201."""
        response = client.post(
            "/admin/users",
            json={
                "email": f"test_{uuid4().hex[:8]}@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert response.status_code == 201
    
    # =========================================================================
    # PATCH /admin/users/{id}
    # =========================================================================
    
    def test_update_user_without_auth_returns_401(self):
        """PATCH /admin/users/{id} without auth should return 401."""
        fake_id = str(uuid4())
        response = client.patch(
            f"/admin/users/{fake_id}",
            json={"role": "FLORIST"}
        )
        assert response.status_code == 401
    
    @given(role=non_admin_roles)
    @settings(max_examples=10, deadline=None)
    def test_update_user_without_admin_role_returns_403(self, role: UserRole):
        """PATCH /admin/users/{id} with non-ADMIN role should return 403."""
        # First create a user as admin
        clear_users()
        create_response = client.post(
            "/admin/users",
            json={
                "email": f"target_{uuid4().hex[:8]}@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        user_id = create_response.json()["id"]
        
        # Try to update as non-admin
        response = client.patch(
            f"/admin/users/{user_id}",
            json={"role": "FLORIST"},
            headers=get_headers_for_role(role)
        )
        assert response.status_code == 403, \
            f"Expected 403 for {role.value}, got {response.status_code}"
    
    def test_update_user_with_admin_role_returns_200(self):
        """PATCH /admin/users/{id} with ADMIN role should return 200."""
        # First create a user
        create_response = client.post(
            "/admin/users",
            json={
                "email": f"target_{uuid4().hex[:8]}@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        user_id = create_response.json()["id"]
        
        # Update as admin
        response = client.patch(
            f"/admin/users/{user_id}",
            json={"subscription_status": "ACTIVE"},
            headers=get_admin_headers()
        )
        assert response.status_code == 200


class TestRBACEnforcementExamples:
    """Example-based tests for RBAC enforcement."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_customer_cannot_list_users(self):
        """CUSTOMER cannot list users."""
        response = client.get(
            "/admin/users",
            headers=get_headers_for_role(UserRole.CUSTOMER)
        )
        assert response.status_code == 403
    
    def test_property_manager_cannot_create_users(self):
        """PROPERTY_MANAGER cannot create users."""
        response = client.post(
            "/admin/users",
            json={
                "email": "test@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_headers_for_role(UserRole.PROPERTY_MANAGER)
        )
        assert response.status_code == 403
    
    def test_florist_cannot_update_users(self):
        """FLORIST cannot update users."""
        # Create a user first
        create_response = client.post(
            "/admin/users",
            json={
                "email": "target@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        user_id = create_response.json()["id"]
        
        # Try to update as florist
        response = client.patch(
            f"/admin/users/{user_id}",
            json={"role": "ADMIN"},
            headers=get_headers_for_role(UserRole.FLORIST)
        )
        assert response.status_code == 403
