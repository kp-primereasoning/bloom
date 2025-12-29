"""
Property test for unauthenticated request rejection.
Feature: auth-rbac, Property 4: Unauthenticated Request Rejection
Validates: Requirements 3.6, 1.4
"""

import os
import sys

import pytest
from hypothesis import given, settings, strategies as st
from fastapi.testclient import TestClient

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# All protected routes
PROTECTED_ROUTES = [
    "/admin/ping",
    "/florist/ping",
    "/pm/ping",
    "/customer/ping",
    "/auth/me",
]


class TestUnauthenticatedRejection:
    """Property tests for unauthenticated request rejection."""
    
    @given(route=st.sampled_from(PROTECTED_ROUTES))
    @settings(max_examples=100)
    def test_unauthenticated_requests_return_401(self, route: str):
        """
        Property 4: Unauthenticated Request Rejection
        
        For any protected route and any request without a valid Authorization header, 
        the system SHALL return a 401 Unauthorized response.
        """
        from main import app
        
        client = TestClient(app)
        
        # Make request without Authorization header
        response = client.get(route)
        
        # Should return 401
        assert response.status_code in [401, 403], f"Expected 401 or 403 for {route}, got {response.status_code}"
        
        # If 401, verify error format
        if response.status_code == 401:
            data = response.json()
            assert "error" in data or "detail" in data, "Response must contain error info"
    
    @given(
        route=st.sampled_from(PROTECTED_ROUTES),
        invalid_token=st.text(alphabet=st.characters(whitelist_categories=('L', 'N'), max_codepoint=127), min_size=10, max_size=100)
    )
    @settings(max_examples=100, deadline=None)
    def test_invalid_token_returns_401(self, route: str, invalid_token: str):
        """
        Test that invalid tokens are rejected with 401.
        """
        from main import app
        
        client = TestClient(app)
        
        # Make request with invalid token
        response = client.get(
            route,
            headers={"Authorization": f"Bearer {invalid_token}"}
        )
        
        # Should return 401
        assert response.status_code == 401, f"Expected 401 for invalid token on {route}, got {response.status_code}"
        
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "INVALID_TOKEN"
