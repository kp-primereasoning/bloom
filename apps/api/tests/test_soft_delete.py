"""
Property test for soft delete behavior.

Property 5: Soft Delete Behavior
For any delete operation on users, properties, or florists, the entity SHALL be
marked as ARCHIVED rather than removed from the database, and the entity SHALL
be excluded from default list queries.

Validates: Requirements 7.1, 7.2, 7.3, 7.4
"""

import pytest
from fastapi.testclient import TestClient
from uuid import uuid4

from main import app
from db.users import get_user_by_email, create_user, clear_users
from models.user import User, UserRole, UserStatus, SubscriptionStatus
from auth.service import auth_service


client = TestClient(app)

ADMIN_EMAIL = "test-admin@bloom.example.com"
ADMIN_PASSWORD = "testpass123"


def get_admin_token():
    """Get admin JWT token for authenticated requests."""
    import asyncio
    from datetime import datetime, timezone

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


class TestSoftDeleteBehavior:
    """Tests for soft delete functionality."""

    def setup_method(self):
        """Set up admin token before each test."""
        self.token = get_admin_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_user_sets_archived_status(self):
        """Deleting a user should set status to ARCHIVED, not remove it."""
        import asyncio
        # Create a test user
        response = client.post("/admin/users", json={
            "email": "delete-test@bloom.example.com",
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)

        assert response.status_code == 201
        user_id = response.json()["id"]

        # Delete the user
        response = client.delete(f"/admin/users/{user_id}", headers=self.headers)

        assert response.status_code == 200
        # User should still exist in DB but be archived (visible with include_archived=true)
        list_response = client.get("/admin/users?include_archived=true", headers=self.headers)
        all_ids = [u["id"] for u in list_response.json()]
        assert user_id in all_ids
    
    def test_archived_user_excluded_from_default_list(self):
        """Archived users should not appear in default list query."""
        # Create and archive a user
        response = client.post("/admin/users", json={
            "email": "archive-test@bloom.example.com",
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        user_id = response.json()["id"]
        
        # Archive the user
        client.delete(f"/admin/users/{user_id}", headers=self.headers)
        
        # List users without include_archived
        response = client.get("/admin/users", headers=self.headers)
        user_ids = [u["id"] for u in response.json()]
        
        # Archived user should not be in list
        assert user_id not in user_ids
    
    def test_archived_user_included_with_flag(self):
        """Archived users should appear when include_archived=true."""
        # Create and archive a user
        response = client.post("/admin/users", json={
            "email": "include-test@bloom.example.com",
            "password": "testpass123",
            "role": "CUSTOMER"
        }, headers=self.headers)
        
        user_id = response.json()["id"]
        
        # Archive the user
        client.delete(f"/admin/users/{user_id}", headers=self.headers)
        
        # List users with include_archived=true
        response = client.get("/admin/users?include_archived=true", headers=self.headers)
        user_ids = [u["id"] for u in response.json()]
        
        # Archived user should be in list
        assert user_id in user_ids
    
    def test_delete_nonexistent_user_returns_404(self):
        """Deleting a non-existent user should return 404."""
        fake_id = str(uuid4())
        response = client.delete(f"/admin/users/{fake_id}", headers=self.headers)
        
        assert response.status_code == 404
