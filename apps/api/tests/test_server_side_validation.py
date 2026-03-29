"""
Property test for server-side validation.

Property 8: Server-Side Validation
For any admin mutation with invalid data (missing required fields, invalid email format,
invalid role), the API SHALL return HTTP 400/422 with a descriptive error message.

Validates: Requirements 4.1, 4.2, 4.4
"""

import pytest
from hypothesis import given, strategies as st, settings
from fastapi.testclient import TestClient
from uuid import uuid4
from datetime import datetime, timezone

from main import app
from db.users import get_user_by_email, create_user, clear_users
from models.user import User, UserRole, UserStatus
from auth.service import auth_service


client = TestClient(app)

ADMIN_EMAIL = "validation-admin@bloom.example.com"
ADMIN_PASSWORD = "testpass123"


def get_admin_token():
    """Get admin JWT token for authenticated requests."""
    import asyncio
    existing = asyncio.get_event_loop().run_until_complete(get_user_by_email(ADMIN_EMAIL))
    if not existing:
        admin = User(
            id=uuid4(),
            email=ADMIN_EMAIL,
            hashed_password=auth_service.hash_password(ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
            created_at=datetime.now(timezone.utc)
        )
        asyncio.get_event_loop().run_until_complete(create_user(admin))

    response = client.post("/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    return response.json()["access_token"]


class TestServerSideValidation:
    """Property tests for server-side validation."""

    def setup_method(self):
        """Set up admin token before each test."""
        self.token = get_admin_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_user_creation_requires_email(self):
        """Creating a user without email should return 422."""
        response = client.post("/admin/users", json={
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_user_creation_requires_password(self):
        """Creating a user without password should return 422."""
        response = client.post("/admin/users", json={
            "email": "test@example.com",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_user_creation_requires_role(self):
        """Creating a user without role should return 422."""
        response = client.post("/admin/users", json={
            "email": "test@example.com",
            "password": "testpass123"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    @given(st.text(min_size=1, max_size=50).filter(lambda x: "@" not in x))
    @settings(max_examples=10, deadline=None)
    def test_user_creation_validates_email_format(self, invalid_email: str):
        """Creating a user with invalid email format should return 422."""
        response = client.post("/admin/users", json={
            "email": invalid_email,
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_user_creation_validates_role(self):
        """Creating a user with invalid role should return 422."""
        response = client.post("/admin/users", json={
            "email": "test@example.com",
            "password": "testpass123",
            "role": "INVALID_ROLE"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_user_creation_validates_password_length(self):
        """Creating a user with short password should return 422."""
        response = client.post("/admin/users", json={
            "email": "test@example.com",
            "password": "short",  # Less than 6 characters
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_property_creation_requires_name(self):
        """Creating a property without name should return 422."""
        response = client.post("/admin/properties", json={
            "address": "123 Test St"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_property_creation_requires_address(self):
        """Creating a property without address should return 422."""
        response = client.post("/admin/properties", json={
            "name": "Test Property"
        }, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_florist_creation_requires_name(self):
        """Creating a florist without name should return 422."""
        response = client.post("/admin/florists", json={}, headers=self.headers)
        
        assert response.status_code == 422
        assert "error" in response.json()
    
    def test_assignment_validates_property_exists(self):
        """Creating assignment with non-existent property should return 400."""
        # First create a florist
        florist_response = client.post("/admin/florists", json={
            "name": "Test Florist"
        }, headers=self.headers)
        florist_id = florist_response.json()["id"]
        
        # Try to assign to non-existent property
        response = client.post("/admin/property-assignments", json={
            "property_id": str(uuid4()),
            "florist_id": florist_id
        }, headers=self.headers)
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_assignment_validates_florist_exists(self):
        """Creating assignment with non-existent florist should return 400."""
        # First create a property
        prop_response = client.post("/admin/properties", json={
            "name": "Test Property",
            "address": "123 Test St"
        }, headers=self.headers)
        property_id = prop_response.json()["id"]
        
        # Try to assign non-existent florist
        response = client.post("/admin/property-assignments", json={
            "property_id": property_id,
            "florist_id": str(uuid4())
        }, headers=self.headers)
        
        assert response.status_code == 400
        assert "error" in response.json()
    
    def test_error_response_contains_request_id(self):
        """Validation errors should include request_id in response."""
        response = client.post("/admin/users", json={
            "email": "invalid-email",
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        assert response.status_code == 422
        data = response.json()
        assert "error" in data
        assert "request_id" in data["error"]
