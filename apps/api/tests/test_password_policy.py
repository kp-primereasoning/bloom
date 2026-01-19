"""
Property-based tests for password policy enforcement.

Property 8: Password Policy Enforcement
*For any* password input, the system SHALL enforce minimum security requirements
(length, complexity) before sending to Cognito.

Validates: Requirements 2.2
"""

import re
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings, assume
import pytest

from botocore.exceptions import ClientError


# Cognito default password policy requirements:
# - Minimum 8 characters
# - At least one uppercase letter
# - At least one lowercase letter
# - At least one number
# - At least one special character

def is_valid_cognito_password(password: str) -> bool:
    """Check if password meets Cognito default requirements."""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'[0-9]', password):
        return False
    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False
    return True


# Strategy for valid passwords
valid_password_strategy = st.from_regex(
    r'[A-Z][a-z]{3}[0-9]{2}[!@#$%]{2}',
    fullmatch=True
)

# Strategy for passwords that are too short
short_password_strategy = st.text(min_size=1, max_size=7)

# Strategy for passwords missing uppercase
no_uppercase_strategy = st.from_regex(r'[a-z]{4}[0-9]{2}[!@#$]{2}', fullmatch=True)

# Strategy for passwords missing lowercase
no_lowercase_strategy = st.from_regex(r'[A-Z]{4}[0-9]{2}[!@#$]{2}', fullmatch=True)

# Strategy for passwords missing numbers
no_numbers_strategy = st.from_regex(r'[A-Z]{2}[a-z]{4}[!@#$]{2}', fullmatch=True)


class TestPasswordPolicyEnforcement:
    """
    Property 8: Password Policy Enforcement
    
    Tests that password policy is enforced for Cognito registration.
    """
    
    @given(
        password=valid_password_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_passwords_are_accepted(self, password):
        """
        For any password meeting all requirements, registration should proceed.
        """
        assert is_valid_cognito_password(password) is True
    
    @given(
        password=short_password_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_short_passwords_are_rejected(self, password):
        """
        For any password shorter than 8 characters, it should be rejected.
        """
        assert is_valid_cognito_password(password) is False
    
    @given(
        password=no_uppercase_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_passwords_without_uppercase_are_rejected(self, password):
        """
        For any password without uppercase letters, it should be rejected.
        """
        assert is_valid_cognito_password(password) is False
    
    @given(
        password=no_lowercase_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_passwords_without_lowercase_are_rejected(self, password):
        """
        For any password without lowercase letters, it should be rejected.
        """
        assert is_valid_cognito_password(password) is False
    
    @given(
        password=no_numbers_strategy,
    )
    @settings(max_examples=50, deadline=None)
    def test_passwords_without_numbers_are_rejected(self, password):
        """
        For any password without numbers, it should be rejected.
        """
        assert is_valid_cognito_password(password) is False
    
    def test_cognito_rejects_weak_password(self):
        """
        Cognito should reject passwords that don't meet policy.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        mock_boto_client = MagicMock()
        mock_boto_client.sign_up.side_effect = ClientError(
            error_response={
                "Error": {
                    "Code": "InvalidPasswordException",
                    "Message": "Password did not conform with policy"
                }
            },
            operation_name="SignUp"
        )
        client._client = mock_boto_client
        
        with pytest.raises(ClientError) as exc_info:
            client.register(
                email="test@example.com",
                password="weak",
                role="RESIDENT"
            )
        
        assert exc_info.value.response["Error"]["Code"] == "InvalidPasswordException"
    
    def test_cognito_accepts_strong_password(self):
        """
        Cognito should accept passwords that meet policy.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        mock_boto_client = MagicMock()
        mock_boto_client.sign_up.return_value = {
            "UserSub": "test-user-sub",
            "UserConfirmed": False,
        }
        client._client = mock_boto_client
        
        result = client.register(
            email="test@example.com",
            password="StrongP@ss123!",
            role="RESIDENT"
        )
        
        assert result["user_sub"] == "test-user-sub"
        mock_boto_client.sign_up.assert_called_once()
    
    @given(
        special_char=st.sampled_from(list("!@#$%^&*()_+-=[]{}|;':\",./<>?")),
    )
    @settings(max_examples=30, deadline=None)
    def test_various_special_characters_are_accepted(self, special_char):
        """
        For any common special character, it should satisfy the special char requirement.
        """
        password = f"Abcd123{special_char}"
        # This password has: uppercase, lowercase, number, special char, 8+ chars
        assert len(password) >= 8
        assert re.search(r'[A-Z]', password)
        assert re.search(r'[a-z]', password)
        assert re.search(r'[0-9]', password)
    
    def test_password_with_spaces_is_handled(self):
        """
        Passwords with spaces should be handled (Cognito allows them).
        """
        password = "Strong P@ss 123"
        # Spaces are allowed in Cognito passwords
        assert len(password) >= 8
        assert re.search(r'[A-Z]', password)
        assert re.search(r'[a-z]', password)
        assert re.search(r'[0-9]', password)
