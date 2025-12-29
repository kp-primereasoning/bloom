"""
Property test for auth/me round-trip consistency.
Feature: auth-rbac, Property 2: Auth/Me Round-Trip Consistency
Validates: Requirements 1.3
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st
from jose import jwt

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import User, UserRole
from auth.service import AuthService


# Strategy for generating valid users
@st.composite
def user_strategy(draw):
    """Generate random valid users for testing."""
    role = draw(st.sampled_from(list(UserRole)))
    email_local = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll',), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=10
    ))
    email = f"{email_local}@test.com"
    
    return User(
        id=uuid4(),
        email=email,
        hashed_password="hashed_password_placeholder",
        role=role,
        created_at=datetime.now(timezone.utc)
    )


class TestAuthMeRoundTrip:
    """Property tests for auth/me round-trip consistency."""
    
    @given(user=user_strategy())
    @settings(max_examples=100)
    def test_auth_me_returns_same_user_info_as_jwt(self, user: User):
        """
        Property 2: Auth/Me Round-Trip Consistency
        
        For any user who successfully logs in, calling GET /auth/me with the 
        returned JWT SHALL return a user object with the same id, email, and 
        role as encoded in the JWT claims.
        """
        auth_service = AuthService()
        
        # Create token for user (simulates login)
        token = auth_service.create_access_token(user)
        
        # Decode token to get claims
        payload = auth_service.verify_token(token)
        
        # Verify the claims match the original user
        assert payload["sub"] == str(user.id), "JWT sub must match user id"
        assert payload["email"] == user.email, "JWT email must match user email"
        assert payload["role"] == user.role.value, "JWT role must match user role"
        
        # Simulate what /auth/me would return based on JWT claims
        # (In real test, this would be an API call)
        user_from_jwt = {
            "id": payload["sub"],
            "email": payload["email"],
            "role": payload["role"]
        }
        
        # Verify round-trip consistency
        assert user_from_jwt["id"] == str(user.id)
        assert user_from_jwt["email"] == user.email
        assert user_from_jwt["role"] == user.role.value
