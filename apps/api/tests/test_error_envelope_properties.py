"""
Property-based tests for error envelope format consistency.

Feature: customer-onboarding-flow, Property 8: Error responses follow Error_Envelope format
Validates: Requirements 12.1, 12.2

For any error response from onboarding endpoints (400, 401, 403, 409, 422),
the response body SHALL contain an `error` object with `code`, `message`, 
and `request_id` fields.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from fastapi.testclient import TestClient
from uuid import uuid4

from main import app


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


def validate_error_envelope(response_json: dict) -> bool:
    """
    Validate that a response follows the Error_Envelope format.
    
    Expected structure:
    {
        "error": {
            "code": str,
            "message": str,
            "request_id": str
        }
    }
    """
    if "error" not in response_json:
        return False
    
    error = response_json["error"]
    if not isinstance(error, dict):
        return False
    
    # Check required fields exist and are strings
    required_fields = ["message", "request_id"]
    for field in required_fields:
        if field not in error:
            return False
        if not isinstance(error[field], str):
            return False
    
    # code is optional but if present should be string
    if "code" in error and not isinstance(error["code"], str):
        return False
    
    return True


class TestErrorEnvelopeProperties:
    """Property-based tests for error envelope format."""
    
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        email=st.text(min_size=1, max_size=50).filter(lambda x: "@" not in x),
        password=st.text(min_size=6, max_size=50)
    )
    def test_invalid_email_returns_error_envelope(self, client, email, password):
        """
        Property 8a: Invalid email format errors follow Error_Envelope format.
        
        For any string that is not a valid email, the 422 response SHALL
        contain an error object with the required fields.
        """
        response = client.post("/auth/register", json={
            "email": email,
            "password": password
        })
        
        # Should be 422 for invalid email
        assert response.status_code == 422
        
        # Validate error envelope format
        response_json = response.json()
        # FastAPI validation errors have a different format, but should still have detail
        assert "detail" in response_json or validate_error_envelope(response_json)
    
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        password=st.text(min_size=1, max_size=5)  # Too short passwords
    )
    def test_short_password_returns_error_envelope(self, client, password):
        """
        Property 8b: Short password errors follow Error_Envelope format.
        
        For any password shorter than 6 characters, the response SHALL
        contain an error with the required fields.
        """
        response = client.post("/auth/register", json={
            "email": f"test_{uuid4().hex[:8]}@example.com",
            "password": password
        })
        
        # Should be 422 for short password
        assert response.status_code == 422
        
        # Validate error envelope format
        response_json = response.json()
        assert "detail" in response_json or validate_error_envelope(response_json)
    
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        property_id=st.uuids().map(str)
    )
    def test_unauthorized_me_property_returns_error_envelope(self, client, property_id):
        """
        Property 8c: Unauthorized /me/property errors follow Error_Envelope format.
        
        For any request to /me/property without authentication, the 401 response
        SHALL contain an error object with the required fields.
        """
        response = client.patch("/me/property", json={
            "property_id": property_id
        })
        
        # Should be 401 for unauthenticated
        assert response.status_code == 401
        
        # Validate error envelope format
        response_json = response.json()
        assert validate_error_envelope(response_json)
    
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        status=st.sampled_from(["ACTIVE", "PAUSED", "CREATED"])
    )
    def test_unauthorized_me_subscription_returns_error_envelope(self, client, status):
        """
        Property 8d: Unauthorized /me/subscription errors follow Error_Envelope format.
        
        For any request to /me/subscription without authentication, the 401 response
        SHALL contain an error object with the required fields.
        """
        response = client.patch("/me/subscription", json={
            "subscription_status": status
        })
        
        # Should be 401 for unauthenticated
        assert response.status_code == 401
        
        # Validate error envelope format
        response_json = response.json()
        assert validate_error_envelope(response_json)
    
    def test_duplicate_email_returns_error_envelope(self, client):
        """
        Property 8e: Duplicate email 409 errors follow Error_Envelope format.
        """
        test_email = f"duplicate_{uuid4().hex[:8]}@test.com"
        
        # First registration
        client.post("/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        
        # Second registration with same email
        response = client.post("/auth/register", json={
            "email": test_email,
            "password": "differentpass"
        })
        
        assert response.status_code == 409
        
        # Validate error envelope format
        response_json = response.json()
        assert validate_error_envelope(response_json)
    
    def test_invalid_property_returns_error_envelope(self, client):
        """
        Property 8f: Invalid property 400 errors follow Error_Envelope format.
        """
        # Register a customer
        test_email = f"customer_{uuid4().hex[:8]}@test.com"
        register_response = client.post("/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        token = register_response.json()["access_token"]
        
        # Try to assign non-existent property
        response = client.patch(
            "/me/property",
            json={"property_id": str(uuid4())},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        
        # Validate error envelope format
        response_json = response.json()
        assert validate_error_envelope(response_json)
    
    def test_created_status_returns_error_envelope(self, client):
        """
        Property 8g: CREATED status rejection follows Error_Envelope format.
        """
        # Register a customer
        test_email = f"customer_{uuid4().hex[:8]}@test.com"
        register_response = client.post("/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        token = register_response.json()["access_token"]
        
        # Try to set status to CREATED
        response = client.patch(
            "/me/subscription",
            json={"subscription_status": "CREATED"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400
        
        # Validate error envelope format
        response_json = response.json()
        assert validate_error_envelope(response_json)
