"""
Property test for RBAC enforcement.
Feature: auth-rbac, Property 3: RBAC Role-Route Access Matrix
Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
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


# Role to route mapping
ROLE_ROUTE_MAP = {
    "ADMIN": "/admin/ping",
    "FLORIST": "/florist/ping",
    "PROPERTY_MANAGER": "/pm/ping",
    "CUSTOMER": "/customer/ping",
}


class TestRBACEnforcement:
    """Property tests for RBAC role-route access matrix."""
    
    @given(
        user_role=st.sampled_from(list(UserRole)),
        target_route=st.sampled_from(list(ROLE_ROUTE_MAP.keys()))
    )
    @settings(max_examples=100)
    def test_rbac_role_route_access_matrix(self, user_role: UserRole, target_route: str):
        """
        Property 3: RBAC Role-Route Access Matrix
        
        For any authenticated user and any protected route namespace, access SHALL 
        be granted if and only if the user's role matches the route's required role.
        When access is denied, the system SHALL return a 403 Forbidden response.
        """
        from main import app
        
        auth_service = AuthService()
        
        # Create a user with the given role
        user = User(
            id=uuid4(),
            email=f"test_{user_role.value.lower()}@test.com",
            hashed_password="hashed",
            role=user_role,
            created_at=datetime.now(timezone.utc)
        )
        
        # Create token for user
        token = auth_service.create_access_token(user)
        
        client = TestClient(app)
        
        # Make request to target route
        route_path = ROLE_ROUTE_MAP[target_route]
        response = client.get(
            route_path,
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Determine expected outcome
        should_have_access = user_role.value == target_route
        
        if should_have_access:
            # Should succeed
            assert response.status_code == 200, f"User with role {user_role.value} should have access to {route_path}"
            data = response.json()
            assert data["ok"] is True
            assert data["role"] == user_role.value
        else:
            # Should be forbidden
            assert response.status_code == 403, f"User with role {user_role.value} should NOT have access to {route_path}"
            data = response.json()
            assert "error" in data
            assert data["error"]["code"] == "FORBIDDEN"
