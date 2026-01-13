"""
Property test for PM assignment status recomputation.
Feature: admin-users-enhanced, Property 9: Property Status Recomputation on PM Assignment
Validates: Requirements 6.1

When a PROPERTY_MANAGER's property_id is updated via PATCH /admin/users/{id}:
- The property's property_manager_id is updated
- The property status is recomputed based on florist and PM assignments

Note: These tests focus on the user update endpoint's effect on property status.
The florist assignment status recomputation is tested separately.
"""

import os
import sys
from uuid import uuid4
from datetime import datetime, timezone

import pytest
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


class TestPMAssignmentStatusRecomputation:
    """
    Property 9: Property Status Recomputation on PM Assignment
    
    Tests that property status is recomputed when PM assignment changes via user update.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_assigning_pm_to_property_updates_property_manager_id(self):
        """
        When a PM is assigned to a property via user update,
        the property's property_manager_id should be set.
        """
        # Create a property
        prop_response = client.post(
            "/admin/properties",
            json={"name": "Test Property", "address": "123 Test St"},
            headers=get_admin_headers()
        )
        assert prop_response.status_code == 201
        property_id = prop_response.json()["id"]
        
        # Create a PM user without property
        pm_response = client.post(
            "/admin/users",
            json={
                "email": f"pm_{uuid4().hex[:8]}@test.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert pm_response.status_code == 201
        pm_id = pm_response.json()["id"]
        
        # Assign PM to property via user update
        update_response = client.patch(
            f"/admin/users/{pm_id}",
            json={"property_id": property_id},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # User should have property_id set
        updated_user = update_response.json()
        assert updated_user["property_id"] == property_id
        
        # Property should show PM email
        props = client.get("/admin/properties", headers=get_admin_headers()).json()
        prop = next(p for p in props if p["id"] == property_id)
        assert prop["property_manager_email"] is not None
    
    def test_creating_pm_with_property_id_updates_property(self):
        """
        When a PM is created with property_id,
        the property should show the PM.
        """
        # Create a property
        prop_response = client.post(
            "/admin/properties",
            json={"name": "Test Property 2", "address": "456 Test Ave"},
            headers=get_admin_headers()
        )
        property_id = prop_response.json()["id"]
        
        # Create PM with property_id
        pm_response = client.post(
            "/admin/users",
            json={
                "email": f"pm2_{uuid4().hex[:8]}@test.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": property_id
            },
            headers=get_admin_headers()
        )
        assert pm_response.status_code == 201
        
        # User should have property_name resolved
        pm_user = pm_response.json()
        assert pm_user["property_id"] == property_id
        assert pm_user["property_name"] == "Test Property 2"
    
    def test_changing_pm_role_clears_property_assignment(self):
        """
        When a PM's role is changed to non-PM,
        the property_id should be cleared and property should lose PM.
        """
        # Create a property
        prop_response = client.post(
            "/admin/properties",
            json={"name": "Test Property 3", "address": "789 Test Blvd"},
            headers=get_admin_headers()
        )
        property_id = prop_response.json()["id"]
        
        # Create PM with property_id
        pm_response = client.post(
            "/admin/users",
            json={
                "email": f"pm3_{uuid4().hex[:8]}@test.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": property_id
            },
            headers=get_admin_headers()
        )
        pm_id = pm_response.json()["id"]
        
        # Verify property has PM
        props = client.get("/admin/properties", headers=get_admin_headers()).json()
        prop = next(p for p in props if p["id"] == property_id)
        assert prop["property_manager_email"] is not None
        
        # Change PM's role to CUSTOMER
        update_response = client.patch(
            f"/admin/users/{pm_id}",
            json={"role": "CUSTOMER"},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # User should no longer have property_id
        updated_user = update_response.json()
        assert updated_user["property_id"] is None
        
        # Property should no longer have PM
        props = client.get("/admin/properties", headers=get_admin_headers()).json()
        prop = next(p for p in props if p["id"] == property_id)
        assert prop["property_manager_email"] is None
    
    def test_reassigning_pm_to_different_property(self):
        """
        When a PM is reassigned from one property to another,
        the old property should lose PM and new property should gain PM.
        """
        # Create two properties
        prop1_response = client.post(
            "/admin/properties",
            json={"name": "Property A", "address": "100 A St"},
            headers=get_admin_headers()
        )
        property1_id = prop1_response.json()["id"]
        
        prop2_response = client.post(
            "/admin/properties",
            json={"name": "Property B", "address": "200 B St"},
            headers=get_admin_headers()
        )
        property2_id = prop2_response.json()["id"]
        
        # Create PM assigned to property 1
        pm_response = client.post(
            "/admin/users",
            json={
                "email": f"pm4_{uuid4().hex[:8]}@test.com",
                "role": "PROPERTY_MANAGER",
                "password": "password123",
                "property_id": property1_id
            },
            headers=get_admin_headers()
        )
        pm_id = pm_response.json()["id"]
        pm_email = pm_response.json()["email"]
        
        # Verify property 1 has PM, property 2 doesn't
        props = client.get("/admin/properties", headers=get_admin_headers()).json()
        prop1 = next(p for p in props if p["id"] == property1_id)
        prop2 = next(p for p in props if p["id"] == property2_id)
        assert prop1["property_manager_email"] == pm_email
        assert prop2["property_manager_email"] is None
        
        # Reassign PM to property 2
        update_response = client.patch(
            f"/admin/users/{pm_id}",
            json={"property_id": property2_id},
            headers=get_admin_headers()
        )
        assert update_response.status_code == 200
        
        # Property 1 should lose PM, Property 2 should gain PM
        props = client.get("/admin/properties", headers=get_admin_headers()).json()
        prop1 = next(p for p in props if p["id"] == property1_id)
        prop2 = next(p for p in props if p["id"] == property2_id)
        assert prop1["property_manager_email"] is None, f"Expected None for prop1, got {prop1['property_manager_email']}"
        assert prop2["property_manager_email"] == pm_email, f"Expected {pm_email} for prop2, got {prop2['property_manager_email']}"
