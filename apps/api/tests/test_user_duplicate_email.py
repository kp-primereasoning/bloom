"""
Property test for duplicate email rejection.
Feature: admin-users-enhanced, Property 7: Duplicate Email Rejection
Validates: Requirements 3.6

For any email address that already exists in the system, a POST /admin/users
request with that email SHALL return 409 Conflict and NOT create a duplicate user.
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
from db.users import clear_users, get_all_users
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


# Strategies
role_strategy = st.sampled_from([r.value for r in UserRole])


class TestDuplicateEmailRejection:
    """
    Property 7: Duplicate Email Rejection
    
    For any email address that already exists in the system, a POST /admin/users
    request with that email SHALL return 409 Conflict and NOT create a duplicate.
    """
    
    @given(
        first_role=role_strategy,
        second_role=role_strategy
    )
    @settings(max_examples=10, deadline=None)
    def test_duplicate_email_returns_409(self, first_role: str, second_role: str):
        """
        Test that creating a user with an existing email returns 409.
        """
        clear_users()
        
        email = f"user_{uuid4().hex[:8]}@test.com"
        
        # Create first user
        first_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": first_role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert first_response.status_code == 201, \
            f"First user creation failed: {first_response.text}"
        
        # Attempt to create second user with same email
        second_response = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": second_role,
                "password": "different_password"
            },
            headers=get_admin_headers()
        )
        
        # Should return 409 Conflict
        assert second_response.status_code == 409, \
            f"Expected 409 for duplicate email, got {second_response.status_code}"
    
    @given(role=role_strategy)
    @settings(max_examples=5, deadline=None)
    def test_duplicate_email_case_insensitive(self, role: str):
        """
        Test that email uniqueness is case-insensitive.
        """
        import asyncio
        clear_users()
        
        base_email = f"User_{uuid4().hex[:8]}@Test.com"
        
        # Create first user with mixed case email
        first_response = client.post(
            "/admin/users",
            json={
                "email": base_email,
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        assert first_response.status_code == 201
        
        # Attempt to create with lowercase version
        second_response = client.post(
            "/admin/users",
            json={
                "email": base_email.lower(),
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        # Should return 409 (case-insensitive duplicate)
        assert second_response.status_code == 409, \
            f"Expected 409 for case-insensitive duplicate, got {second_response.status_code}"
    
    @given(role=role_strategy)
    @settings(max_examples=5, deadline=None)
    def test_no_duplicate_created(self, role: str):
        """
        Test that duplicate email attempt does not create a second user.
        """
        import asyncio
        clear_users()
        
        email = f"user_{uuid4().hex[:8]}@test.com"
        
        # Create first user
        client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        
        # Get user count before duplicate attempt
        users_before = asyncio.run(get_all_users())
        count_before = len(users_before)

        # Attempt duplicate
        client.post(
            "/admin/users",
            json={
                "email": email,
                "role": role,
                "password": "password123"
            },
            headers=get_admin_headers()
        )

        # Get user count after duplicate attempt
        users_after = asyncio.run(get_all_users())
        count_after = len(users_after)
        
        # Count should not have increased
        assert count_after == count_before, \
            f"User count increased from {count_before} to {count_after} after duplicate attempt"


class TestDuplicateEmailExamples:
    """Example-based tests for duplicate email rejection."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Clear users before each test."""
        clear_users()
        yield
        clear_users()
    
    def test_exact_duplicate_rejected(self):
        """Exact duplicate email should be rejected."""
        email = "test@example.com"
        
        # Create first user
        response1 = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert response1.status_code == 201
        
        # Attempt duplicate
        response2 = client.post(
            "/admin/users",
            json={
                "email": email,
                "role": "ADMIN",
                "password": "different"
            },
            headers=get_admin_headers()
        )
        assert response2.status_code == 409
    
    def test_different_emails_allowed(self):
        """Different emails should be allowed."""
        # Create first user
        response1 = client.post(
            "/admin/users",
            json={
                "email": "user1@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert response1.status_code == 201
        
        # Create second user with different email
        response2 = client.post(
            "/admin/users",
            json={
                "email": "user2@example.com",
                "role": "CUSTOMER",
                "password": "password123"
            },
            headers=get_admin_headers()
        )
        assert response2.status_code == 201
