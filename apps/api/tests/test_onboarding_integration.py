"""
Integration tests for the complete customer onboarding flow.
Tests the full journey: register → set property → activate subscription → access dashboard.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from main import app
from db.database import get_db
from models import Property, PropertyStatus


@pytest.fixture
def client():
    """Create a test client."""
    return TestClient(app)


@pytest.fixture
def test_property(client):
    """Create a test property for onboarding."""
    # First, login as admin to create a property
    admin_login = client.post("/auth/login", json={
        "email": "admin@bloom.test",
        "password": "admin123"
    })
    
    if admin_login.status_code != 200:
        pytest.skip("Admin user not available for test setup")
    
    admin_token = admin_login.json()["access_token"]
    
    # Create a test property
    property_response = client.post(
        "/admin/properties",
        json={
            "name": f"Test Property {uuid4().hex[:8]}",
            "address": "123 Test Street"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    
    if property_response.status_code != 201:
        pytest.skip("Could not create test property")
    
    return property_response.json()


class TestOnboardingIntegration:
    """Integration tests for the complete onboarding flow."""
    
    def test_full_onboarding_flow(self, client, test_property):
        """
        Test the complete onboarding journey:
        1. Register new customer
        2. Verify initial state (CUSTOMER role, CREATED status, no property)
        3. Assign property
        4. Verify property assignment
        5. Activate subscription
        6. Verify final state (ACTIVE status)
        """
        # Generate unique email for this test
        test_email = f"customer_{uuid4().hex[:8]}@test.com"
        test_password = "testpass123"
        
        # Step 1: Register new customer
        register_response = client.post("/auth/register", json={
            "email": test_email,
            "password": test_password
        })
        
        assert register_response.status_code == 201, f"Registration failed: {register_response.json()}"
        register_data = register_response.json()
        
        # Verify registration response structure
        assert "access_token" in register_data
        assert register_data["token_type"] == "bearer"
        assert "user" in register_data
        
        token = register_data["access_token"]
        user = register_data["user"]
        
        # Step 2: Verify initial state
        assert user["role"] == "CUSTOMER"
        assert user["subscription_status"] == "CREATED"
        assert user["property_id"] is None
        
        # Verify /auth/me returns same data
        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["subscription_status"] == "CREATED"
        assert me_data["property_id"] is None
        
        # Step 3: Assign property
        property_response = client.patch(
            "/me/property",
            json={"property_id": test_property["id"]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert property_response.status_code == 200, f"Property assignment failed: {property_response.json()}"
        property_data = property_response.json()
        
        # Step 4: Verify property assignment
        assert property_data["property_id"] == test_property["id"]
        assert property_data["subscription_status"] == "CREATED"  # Still CREATED
        
        # Step 5: Activate subscription
        subscription_response = client.patch(
            "/me/subscription",
            json={"subscription_status": "ACTIVE"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert subscription_response.status_code == 200, f"Subscription activation failed: {subscription_response.json()}"
        subscription_data = subscription_response.json()
        
        # Step 6: Verify final state
        assert subscription_data["subscription_status"] == "ACTIVE"
        assert subscription_data["property_id"] == test_property["id"]
        
        # Final verification via /auth/me
        final_me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert final_me_response.status_code == 200
        final_data = final_me_response.json()
        assert final_data["subscription_status"] == "ACTIVE"
        assert final_data["property_id"] == test_property["id"]
    
    def test_duplicate_email_returns_409(self, client):
        """Test that registering with an existing email returns 409."""
        test_email = f"duplicate_{uuid4().hex[:8]}@test.com"
        test_password = "testpass123"
        
        # First registration should succeed
        first_response = client.post("/auth/register", json={
            "email": test_email,
            "password": test_password
        })
        assert first_response.status_code == 201
        
        # Second registration with same email should fail
        second_response = client.post("/auth/register", json={
            "email": test_email,
            "password": "differentpass"
        })
        assert second_response.status_code == 409
        
        # Verify error envelope format
        error_data = second_response.json()
        assert "error" in error_data
        assert "message" in error_data["error"]
        assert "request_id" in error_data["error"]
    
    def test_invalid_property_returns_400(self, client):
        """Test that assigning a non-existent property returns 400."""
        # Register a new customer
        test_email = f"customer_{uuid4().hex[:8]}@test.com"
        register_response = client.post("/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert register_response.status_code == 201
        token = register_response.json()["access_token"]
        
        # Try to assign non-existent property
        fake_property_id = str(uuid4())
        property_response = client.patch(
            "/me/property",
            json={"property_id": fake_property_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert property_response.status_code == 400
        
        # Verify error envelope format
        error_data = property_response.json()
        assert "error" in error_data
        assert "request_id" in error_data["error"]
    
    def test_created_status_rejected(self, client, test_property):
        """Test that setting subscription_status to CREATED is rejected."""
        # Register and assign property
        test_email = f"customer_{uuid4().hex[:8]}@test.com"
        register_response = client.post("/auth/register", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert register_response.status_code == 201
        token = register_response.json()["access_token"]
        
        # Assign property first
        client.patch(
            "/me/property",
            json={"property_id": test_property["id"]},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try to set status to CREATED (should fail)
        subscription_response = client.patch(
            "/me/subscription",
            json={"subscription_status": "CREATED"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert subscription_response.status_code == 400
        
        # Verify error envelope format
        error_data = subscription_response.json()
        assert "error" in error_data
        assert "request_id" in error_data["error"]
