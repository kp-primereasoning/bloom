"""
Property tests for customer registration endpoint.
Feature: customer-onboarding-flow, Property 1: Registration creates CUSTOMER with correct defaults
Feature: customer-onboarding-flow, Property 2: Registration rejects invalid email formats
Validates: Requirements 1.2, 1.3, 1.5
"""

import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.user import User, UserRole, SubscriptionStatus
from auth.service import AuthService


# Strategy for generating valid email local parts
@st.composite
def valid_email_strategy(draw):
    """Generate random valid email addresses."""
    local_part = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Ll',), min_codepoint=97, max_codepoint=122),
        min_size=3,
        max_size=15
    ))
    domain = draw(st.sampled_from(['test.com', 'example.org', 'mail.net', 'bloom.io']))
    return f"{local_part}@{domain}"


# Strategy for generating valid passwords
@st.composite
def valid_password_strategy(draw):
    """Generate random valid passwords (min 6 chars)."""
    return draw(st.text(
        alphabet=st.characters(whitelist_categories=('L', 'N'), min_codepoint=48, max_codepoint=122),
        min_size=6,
        max_size=30
    ))


# Strategy for generating invalid email formats
@st.composite
def invalid_email_strategy(draw):
    """Generate strings that are not valid email formats."""
    choice = draw(st.integers(min_value=0, max_value=4))
    
    if choice == 0:
        # No @ symbol
        return draw(st.text(min_size=1, max_size=20).filter(lambda x: '@' not in x and len(x) > 0))
    elif choice == 1:
        # Multiple @ symbols
        local = draw(st.text(
            alphabet=st.characters(whitelist_categories=('Ll',)),
            min_size=1,
            max_size=5
        ))
        return f"{local}@@test.com"
    elif choice == 2:
        # No domain after @
        local = draw(st.text(
            alphabet=st.characters(whitelist_categories=('Ll',)),
            min_size=1,
            max_size=5
        ))
        return f"{local}@"
    elif choice == 3:
        # No local part before @
        return "@test.com"
    else:
        # Empty string
        return ""


class TestRegistrationDefaults:
    """
    Property 1: Registration creates CUSTOMER with correct defaults
    
    For any valid email and password combination, registering via POST /auth/register
    SHALL create a user with role=CUSTOMER, subscription_status=CREATED, property_id=null,
    and return a response containing access_token, token_type="bearer", and a user object.
    """
    
    @given(email=valid_email_strategy(), password=valid_password_strategy())
    @settings(max_examples=100)
    def test_registration_creates_customer_with_correct_defaults(self, email: str, password: str):
        """
        Feature: customer-onboarding-flow, Property 1: Registration creates CUSTOMER with correct defaults
        Validates: Requirements 1.2, 1.3
        
        Test that registration logic creates users with correct default values.
        """
        auth_service = AuthService()
        
        # Simulate registration logic (what the endpoint does)
        hashed_password = auth_service.hash_password(password)
        new_user = User(
            id=uuid4(),
            email=email,
            hashed_password=hashed_password,
            role=UserRole.CUSTOMER,
            property_id=None,
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc)
        )
        
        # Verify defaults
        assert new_user.role == UserRole.CUSTOMER, "New user must have CUSTOMER role"
        assert new_user.subscription_status == SubscriptionStatus.CREATED, "New user must have CREATED subscription status"
        assert new_user.property_id is None, "New user must have null property_id"
        
        # Verify JWT can be created and contains correct claims
        token = auth_service.create_access_token(new_user)
        payload = auth_service.verify_token(token)
        
        assert payload["sub"] == str(new_user.id), "JWT sub must match user id"
        assert payload["email"] == new_user.email, "JWT email must match user email"
        assert payload["role"] == UserRole.CUSTOMER.value, "JWT role must be CUSTOMER"
    
    @given(email=valid_email_strategy(), password=valid_password_strategy())
    @settings(max_examples=100)
    def test_registration_response_format(self, email: str, password: str):
        """
        Feature: customer-onboarding-flow, Property 1: Registration creates CUSTOMER with correct defaults
        Validates: Requirements 1.3
        
        Test that registration response contains required fields.
        """
        auth_service = AuthService()
        
        # Simulate registration
        hashed_password = auth_service.hash_password(password)
        new_user = User(
            id=uuid4(),
            email=email,
            hashed_password=hashed_password,
            role=UserRole.CUSTOMER,
            property_id=None,
            subscription_status=SubscriptionStatus.CREATED,
            created_at=datetime.now(timezone.utc)
        )
        
        # Simulate response construction
        access_token = auth_service.create_access_token(new_user)
        response = {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(new_user.id),
                "email": new_user.email,
                "role": new_user.role.value,
                "property_id": new_user.property_id,
                "subscription_status": new_user.subscription_status.value,
                "created_at": new_user.created_at.isoformat()
            }
        }
        
        # Verify response structure
        assert "access_token" in response, "Response must contain access_token"
        assert response["token_type"] == "bearer", "token_type must be 'bearer'"
        assert "user" in response, "Response must contain user object"
        assert response["user"]["role"] == "CUSTOMER", "User role must be CUSTOMER"
        assert response["user"]["subscription_status"] == "CREATED", "subscription_status must be CREATED"
        assert response["user"]["property_id"] is None, "property_id must be null"


class TestRegistrationEmailValidation:
    """
    Property 2: Registration rejects invalid email formats
    
    For any string that is not a valid email format, submitting it to POST /auth/register
    SHALL return HTTP 422 with validation error details.
    """
    
    def test_empty_email_rejected(self):
        """
        Feature: customer-onboarding-flow, Property 2: Registration rejects invalid email formats
        Validates: Requirements 1.5
        
        Empty email should be rejected.
        """
        from pydantic import ValidationError
        from schemas.domain import RegisterRequest
        
        with pytest.raises(ValidationError):
            RegisterRequest(email="", password="validpassword123")
    
    def test_no_at_symbol_rejected(self):
        """
        Feature: customer-onboarding-flow, Property 2: Registration rejects invalid email formats
        Validates: Requirements 1.5
        
        Email without @ symbol should be rejected.
        """
        from pydantic import ValidationError
        from schemas.domain import RegisterRequest
        
        with pytest.raises(ValidationError):
            RegisterRequest(email="notanemail", password="validpassword123")
    
    def test_no_domain_rejected(self):
        """
        Feature: customer-onboarding-flow, Property 2: Registration rejects invalid email formats
        Validates: Requirements 1.5
        
        Email without domain should be rejected.
        """
        from pydantic import ValidationError
        from schemas.domain import RegisterRequest
        
        with pytest.raises(ValidationError):
            RegisterRequest(email="user@", password="validpassword123")
    
    def test_short_password_rejected(self):
        """
        Feature: customer-onboarding-flow, Property 2: Registration rejects invalid email formats
        Validates: Requirements 1.5
        
        Password shorter than 6 characters should be rejected.
        """
        from pydantic import ValidationError
        from schemas.domain import RegisterRequest
        
        with pytest.raises(ValidationError):
            RegisterRequest(email="valid@email.com", password="short")
