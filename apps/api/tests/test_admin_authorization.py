"""
Property test for admin endpoint authorization.
Feature: core-data-model, Property 6: Admin Endpoint Authorization
Validates: Requirements 8.3, 8.4, 9.3, 9.4, 10.3, 10.4
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import User, UserRole
from auth.service import AuthService


# Admin endpoints to test
ADMIN_ENDPOINTS = [
    ("GET", "/admin/properties"),
    ("POST", "/admin/properties"),
    ("GET", "/admin/florists"),
    ("POST", "/admin/florists"),
    ("GET", "/admin/property-assignments"),
    ("POST", "/admin/property-assignments"),
]

# Non-admin roles
NON_ADMIN_ROLES = [
    UserRole.CUSTOMER,
    UserRole.PROPERTY_MANAGER,
    UserRole.FLORIST,
]


class TestAdminEndpointAuthorization:
    """
    Property 6: Admin Endpoint Authorization
    
    For any request to /admin/** endpoints:
    - Requests without valid JWT SHALL return 401 Unauthorized
    - Requests with valid JWT but non-ADMIN role SHALL return 403 Forbidden
    - Requests with valid JWT and ADMIN role SHALL be processed
    """
    
    @given(
        endpoint_idx=st.integers(min_value=0, max_value=len(ADMIN_ENDPOINTS) - 1)
    )
    @settings(max_examples=100)
    def test_unauthenticated_returns_401(self, endpoint_idx: int):
        """
        Requests without valid JWT SHALL return 401 Unauthorized.
        """
        from main import app
        
        method, path = ADMIN_ENDPOINTS[endpoint_idx]
        client = TestClient(app)
        
        # Make request without auth header
        if method == "GET":
            response = client.get(path)
        else:
            response = client.post(path, json={})
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated {method} {path}"
    
    @given(
        role=st.sampled_from(NON_ADMIN_ROLES),
        endpoint_idx=st.integers(min_value=0, max_value=len(ADMIN_ENDPOINTS) - 1)
    )
    @settings(max_examples=100)
    def test_non_admin_returns_403(self, role: UserRole, endpoint_idx: int):
        """
        Requests with valid JWT but non-ADMIN role SHALL return 403 Forbidden.
        """
        from main import app
        
        auth_service = AuthService()
        method, path = ADMIN_ENDPOINTS[endpoint_idx]
        
        # Create user with non-admin role
        user = User(
            id=uuid4(),
            email=f"test_{role.value.lower()}@test.com",
            hashed_password="hashed",
            role=role,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Make request
        if method == "GET":
            response = client.get(path, headers=headers)
        else:
            response = client.post(path, json={}, headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for {role.value} accessing {method} {path}"
        
        # Verify error format
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "FORBIDDEN"
    
    @given(
        endpoint_idx=st.integers(min_value=0, max_value=1)  # Only GET endpoints for success test
    )
    @settings(max_examples=50)
    def test_admin_can_access_get_endpoints(self, endpoint_idx: int):
        """
        Requests with valid JWT and ADMIN role SHALL be processed (GET endpoints).
        """
        from main import app
        
        auth_service = AuthService()
        
        # Only test GET endpoints (POST requires valid body and DB)
        get_endpoints = [e for e in ADMIN_ENDPOINTS if e[0] == "GET"]
        if endpoint_idx >= len(get_endpoints):
            return
        
        method, path = get_endpoints[endpoint_idx]
        
        # Create admin user
        user = User(
            id=uuid4(),
            email="admin@test.com",
            hashed_password="hashed",
            role=UserRole.ADMIN,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get(path, headers=headers)
        
        # Should not be 401 or 403 (may be 500 if DB not connected, but auth passed)
        assert response.status_code not in [401, 403], f"Admin should have access to {path}"


class TestAdminEndpointAuthorizationExamples:
    """Example-based tests for admin authorization."""
    
    def test_unauthenticated_properties_get(self):
        """GET /admin/properties without auth returns 401."""
        from main import app
        
        client = TestClient(app)
        response = client.get("/admin/properties")
        
        assert response.status_code == 401
    
    def test_unauthenticated_florists_get(self):
        """GET /admin/florists without auth returns 401."""
        from main import app
        
        client = TestClient(app)
        response = client.get("/admin/florists")
        
        assert response.status_code == 401
    
    def test_customer_cannot_access_properties(self):
        """Customer role cannot access /admin/properties."""
        from main import app
        
        auth_service = AuthService()
        user = User(
            id=uuid4(),
            email="customer@test.com",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        response = client.get(
            "/admin/properties",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "FORBIDDEN"
