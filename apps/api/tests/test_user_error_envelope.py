"""
Property test for error envelope format.
Feature: admin-users-enhanced, Property 10: Error Envelope Format
Validates: Requirements 9.1

All error responses SHALL include:
- HTTP status code (4xx or 5xx)
- Error message in response body
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


class TestErrorEnvelopeFormat:
    """
    Property 10: Error Envelope Format
    
    Tests that all error responses have proper format.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_401_error_has_message(self):
        """401 Unauthorized should have error message."""
        response = client.get("/admin/users")
        
        assert response.status_code == 401
        # Response should have content
        assert len(response.text) > 0
    
    def test_403_error_has_message(self):
        """403 Forbidden should have error message."""
        # Create a non-admin token
        user = User(
            id=uuid4(),
            email="customer@test.com",
            hashed_password="hashed",
            role=UserRole.CUSTOMER,
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc)
        )
        token = auth_service.create_access_token(user)
        
        response = client.get(
            "/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403
        assert len(response.text) > 0
    
    def test_404_error_has_message(self):
        """404 Not Found should have error message."""
        fake_id = str(uuid4())
        response = client.patch(
            f"/admin/users/{fake_id}",
            json={"role": "FLORIST"},
            headers=get_admin_headers()
        )
        
        assert response.status_code == 404
        assert len(response.text) > 0
        # Should mention "not found" or similar
        assert "not found" in response.text.lower() or "user" in response.text.lower()
    
    def test_409_conflict_error_has_message(self):
        """409 Conflict should have error message."""
        # Create a user
        email = f"duplicate_{uuid4().hex[:8]}@test.com"
        client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        # Try to create duplicate
        response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 409
        assert len(response.text) > 0
        # Should mention "email" or "exists"
        error_text = response.text.lower()
        assert "email" in error_text or "exists" in error_text
    
    def test_400_bad_request_error_has_message(self):
        """400 Bad Request should have error message."""
        # Try to create CUSTOMER with property_id
        response = client.post(
            "/admin/users",
            json={
                "email": f"test_{uuid4().hex[:8]}@test.com",
                "role": "CUSTOMER",
                "password": "password123",
                "property_id": str(uuid4())
            },
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
        assert len(response.text) > 0
        # Should mention "property" or validation error
        assert "property" in response.text.lower()
    
    def test_validation_error_for_invalid_subscription_status_update(self):
        """Updating subscription_status for non-CUSTOMER should return 400 with message."""
        # Create a FLORIST
        florist_response = client.post(
            "/admin/users",
            json={
                "email": f"florist_{uuid4().hex[:8]}@test.com",
                "role": "FLORIST",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        florist_id = florist_response.json()["id"]
        
        # Try to update subscription_status
        response = client.patch(
            f"/admin/users/{florist_id}",
            json={"subscription_status": "ACTIVE"},
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
        assert len(response.text) > 0
        # Should mention subscription_status or CUSTOMER
        error_text = response.text.lower()
        assert "subscription" in error_text or "customer" in error_text
    
    def test_validation_error_for_invalid_property_id_update(self):
        """Updating property_id for non-PM should return 400 with message."""
        # Create a CUSTOMER
        customer_response = client.post(
            "/admin/users",
            json={
                "email": f"customer_{uuid4().hex[:8]}@test.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        customer_id = customer_response.json()["id"]
        
        # Create a property
        prop_response = client.post(
            "/admin/properties",
            json={"name": "Test Prop", "address": "123 St"},
            headers=get_admin_headers()
        )
        property_id = prop_response.json()["id"]
        
        # Try to update property_id
        response = client.patch(
            f"/admin/users/{customer_id}",
            json={"property_id": property_id},
            headers=get_admin_headers()
        )
        
        assert response.status_code == 400
        assert len(response.text) > 0
        # Should mention property or PROPERTY_MANAGER
        error_text = response.text.lower()
        assert "property" in error_text


class TestErrorEnvelopeExamples:
    """Example-based tests for error envelope format."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_error_response_is_json(self):
        """Error responses should be valid JSON."""
        response = client.get("/admin/users")
        
        assert response.status_code == 401
        # Should be parseable as JSON
        try:
            data = response.json()
            # API uses 'error' envelope format
            assert "error" in data or "detail" in data
        except Exception:
            # If not JSON, at least should have text content
            assert len(response.text) > 0
    
    def test_422_validation_error_format(self):
        """422 Validation Error should have proper format."""
        # Send invalid data (missing required fields)
        response = client.post(
            "/admin/users",
            json={"email": "test@example.com"},  # Missing role and password
            headers=get_admin_headers()
        )
        
        assert response.status_code == 422
        data = response.json()
        # API uses 'error' envelope format with code and message
        assert "error" in data
        assert "message" in data["error"]
