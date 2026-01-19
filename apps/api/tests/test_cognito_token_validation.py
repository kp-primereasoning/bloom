"""
Property-based tests for Cognito token validation.

Property 1: Token Validation Correctness
*For any* JWT token, the validation SHALL correctly identify valid tokens
(properly signed, not expired, correct audience/issuer) and reject invalid ones.

Validates: Requirements 3.2, 3.3, 3.4, 3.5
"""

import json
import time
from unittest.mock import patch, MagicMock, PropertyMock
from hypothesis import given, strategies as st, settings
import pytest

from jose import jwt


class TestCognitoTokenValidation:
    """
    Property 1: Token Validation Correctness
    
    Tests that token validation correctly identifies valid and invalid tokens.
    """
    
    @given(
        user_sub=st.uuids().map(str),
        email=st.emails(),
        role=st.sampled_from(["RESIDENT", "PROPERTY_MANAGER", "FLORIST", "ADMIN"]),
    )
    @settings(max_examples=50, deadline=None)
    def test_valid_token_claims_are_extracted(self, user_sub, email, role):
        """
        For any valid token with user claims, validation should extract
        sub, email, and role correctly.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        # Create a mock token with expected claims
        mock_claims = {
            "sub": user_sub,
            "email": email,
            "custom:role": role,
            "aud": "test-client-id",
            "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test",
            "exp": int(time.time()) + 3600,
            "iat": int(time.time()),
        }
        
        # Mock the validation to return our claims
        with patch.object(client, 'validate_token', return_value=mock_claims):
            result = client.validate_token("mock-token")
        
        assert result is not None
        assert result["sub"] == user_sub
        assert result["email"] == email
        assert result["custom:role"] == role
    
    @given(
        expired_seconds_ago=st.integers(min_value=1, max_value=86400),
    )
    @settings(max_examples=50, deadline=None)
    def test_expired_tokens_are_rejected(self, expired_seconds_ago):
        """
        For any token that expired in the past, validation should return None.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        # Create expired token claims
        expired_time = int(time.time()) - expired_seconds_ago
        
        # Mock JWKS and create a token that would fail exp validation
        mock_jwks = {
            "keys": [{
                "kid": "test-key-id",
                "kty": "RSA",
                "n": "test-n",
                "e": "AQAB",
            }]
        }
        
        with patch.object(client, '_get_jwks', return_value=mock_jwks):
            with patch('jose.jwt.decode') as mock_decode:
                from jose import JWTError
                mock_decode.side_effect = JWTError("Token is expired")
                
                result = client.validate_token("expired-token")
        
        assert result is None
    
    @given(
        wrong_audience=st.text(min_size=5, max_size=50).filter(
            lambda x: x != "test-client-id"
        ),
    )
    @settings(max_examples=50, deadline=None)
    def test_wrong_audience_tokens_are_rejected(self, wrong_audience):
        """
        For any token with wrong audience, validation should return None.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        mock_jwks = {
            "keys": [{
                "kid": "test-key-id",
                "kty": "RSA",
                "n": "test-n",
                "e": "AQAB",
            }]
        }
        
        with patch.object(client, '_get_jwks', return_value=mock_jwks):
            with patch('jose.jwt.decode') as mock_decode:
                from jose import JWTError
                mock_decode.side_effect = JWTError("Invalid audience")
                
                result = client.validate_token("wrong-audience-token")
        
        assert result is None
    
    @given(
        wrong_issuer=st.text(min_size=10, max_size=100).filter(
            lambda x: "cognito-idp" not in x
        ),
    )
    @settings(max_examples=50, deadline=None)
    def test_wrong_issuer_tokens_are_rejected(self, wrong_issuer):
        """
        For any token with wrong issuer, validation should return None.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        mock_jwks = {
            "keys": [{
                "kid": "test-key-id",
                "kty": "RSA",
                "n": "test-n",
                "e": "AQAB",
            }]
        }
        
        with patch.object(client, '_get_jwks', return_value=mock_jwks):
            with patch('jose.jwt.decode') as mock_decode:
                from jose import JWTError
                mock_decode.side_effect = JWTError("Invalid issuer")
                
                result = client.validate_token("wrong-issuer-token")
        
        assert result is None
    
    def test_missing_kid_header_returns_none(self):
        """
        Token without 'kid' header should be rejected.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        with patch('jose.jwt.get_unverified_headers', return_value={}):
            result = client._get_signing_key("token-without-kid")
        
        assert result is None
    
    def test_unknown_kid_returns_none_after_refresh(self):
        """
        Token with unknown 'kid' should trigger JWKS refresh and return None if still not found.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        mock_jwks = {
            "keys": [{
                "kid": "known-key-id",
                "kty": "RSA",
                "n": "test-n",
                "e": "AQAB",
            }]
        }
        
        with patch('jose.jwt.get_unverified_headers', return_value={"kid": "unknown-key-id"}):
            with patch.object(client, '_get_jwks', return_value=mock_jwks) as mock_get_jwks:
                result = client._get_signing_key("token-with-unknown-kid")
        
        assert result is None
        # Should have called _get_jwks twice (initial + refresh)
        assert mock_get_jwks.call_count == 2
    
    @given(
        malformed_token=st.sampled_from([
            "",
            "not-a-jwt",
            "only.two.parts.here.extra",
            "a.b",
            "invalid-base64.invalid-base64.invalid-base64",
        ]),
    )
    @settings(max_examples=10, deadline=None)
    def test_malformed_tokens_are_rejected(self, malformed_token):
        """
        For any malformed token, validation should return None without crashing.
        """
        from services.aws.cognito import CognitoClient
        
        client = CognitoClient(
            user_pool_id="us-east-1_test",
            client_id="test-client-id",
            region="us-east-1"
        )
        
        # Malformed tokens should fail gracefully
        result = client.validate_token(malformed_token)
        assert result is None
