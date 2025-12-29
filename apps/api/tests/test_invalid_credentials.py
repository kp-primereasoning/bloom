"""
Property test for invalid credentials handling.
Feature: auth-rbac, Property 10: Invalid Credentials Return 401
Validates: Requirements 1.2
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


# Strategy for generating invalid credentials
@st.composite
def invalid_credentials_strategy(draw):
    """Generate random invalid credential combinations."""
    email = draw(st.emails())
    password = draw(st.text(min_size=1, max_size=50))
    return {"email": email, "password": password}


class TestInvalidCredentials:
    """Property tests for invalid credentials handling."""
    
    @given(creds=invalid_credentials_strategy())
    @settings(max_examples=100, deadline=None)
    def test_invalid_credentials_return_401(self, creds: dict):
        """
        Property 10: Invalid Credentials Return 401
        
        For any login attempt with invalid email or password, the system SHALL 
        return a 401 Unauthorized response with the standard error format.
        """
        # Import here to avoid circular imports
        from main import app
        from db.users import clear_users
        
        # Clear users to ensure credentials are invalid
        clear_users()
        
        client = TestClient(app)
        
        response = client.post("/auth/login", json=creds)
        
        # Should return 401
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        # Verify error format
        data = response.json()
        assert "error" in data, "Response must contain 'error' key"
        
        error = data["error"]
        assert "code" in error, "Error must contain 'code' field"
        assert "message" in error, "Error must contain 'message' field"
        assert "request_id" in error, "Error must contain 'request_id' field"
        
        # Verify error code
        assert error["code"] == "INVALID_CREDENTIALS", f"Expected INVALID_CREDENTIALS, got {error['code']}"
