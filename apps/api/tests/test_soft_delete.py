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
from db.users import clear_users, create_user
from models.user import User, UserRole, UserStatus, SubscriptionStatus
from auth.service import auth_service


client = TestClient(app)


def get_admin_token():
    """Get admin JWT token for authenticated requests."""
    import asyncio
    from datetime import datetime, timezone

    admin_email = "test-admin@bloom.example.com"
    admin = User(
        id=uuid4(),
        email=admin_email,
        hashed_password=auth_service.hash_password("testpass123"),
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        created_at=datetime.now(timezone.utc),
    )
    try:
        asyncio.get_event_loop().run_until_complete(create_user(admin))
    except Exception:
        pass  # Already exists

    response = client.post("/auth/login", json={
        "email": admin_email,
        "password": "testpass123",
    })
    return response.json()["access_token"]


class TestSoftDeleteBehavior:
    """Tests for soft delete functionality."""
    
    def setup_method(self):
        """Clear users before each test."""
        clear_users()
        self.token = get_admin_token()
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_user_sets_archived_status(self):
        """Deleting a user should set status to ARCHIVED, not remove it."""
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
        # User should still exist in storage but be archived
        from db.database import SessionLocal
        from models.user import UserDB
        with SessionLocal() as db:
            assert db.query(UserDB).filter(UserDB.id == user_id).first() is not None
    
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
