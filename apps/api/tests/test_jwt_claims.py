"""
Property test for JWT claims.
Feature: auth-rbac, Property 1: JWT Contains Required Claims
Validates: Requirements 1.1, 2.2
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


class TestJWTClaims:
    """Property tests for JWT claim validation."""
    
    @given(user=user_strategy())
    @settings(max_examples=100)
    def test_jwt_contains_required_claims(self, user: User):
        """
        Property 1: JWT Contains Required Claims
        
        For any successful login with valid credentials, the returned JWT SHALL 
        contain all required claims: sub (user id), email, role, iss ("bloom-api"), 
        aud ("bloom-web"), exp (expiration), and iat (issued at).
        """
        auth_service = AuthService()
        token = auth_service.create_access_token(user)
        
        # Decode without verification to inspect claims
        payload = jwt.decode(
            token,
            auth_service.secret_key,
            algorithms=[auth_service.algorithm],
            audience="bloom-web",
            issuer="bloom-api"
        )
        
        # Verify all required claims are present
        assert "sub" in payload, "JWT must contain 'sub' claim"
        assert "email" in payload, "JWT must contain 'email' claim"
        assert "role" in payload, "JWT must contain 'role' claim"
        assert "iss" in payload, "JWT must contain 'iss' claim"
        assert "aud" in payload, "JWT must contain 'aud' claim"
        assert "exp" in payload, "JWT must contain 'exp' claim"
        assert "iat" in payload, "JWT must contain 'iat' claim"
        
        # Verify claim values
        assert payload["sub"] == str(user.id), "sub must match user id"
        assert payload["email"] == user.email, "email must match user email"
        assert payload["role"] == user.role.value, "role must match user role"
        assert payload["iss"] == "bloom-api", "iss must be 'bloom-api'"
        assert payload["aud"] == "bloom-web", "aud must be 'bloom-web'"
        
        # Verify exp and iat are valid UNIX timestamps
        assert isinstance(payload["exp"], int), "exp must be an integer timestamp"
        assert isinstance(payload["iat"], int), "iat must be an integer timestamp"
        assert payload["exp"] > payload["iat"], "exp must be after iat"
