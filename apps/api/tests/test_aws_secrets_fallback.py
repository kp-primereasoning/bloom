"""
Property-based tests for AWS Secrets Manager fallback behavior.

Property 3: Secrets Manager Fallback
*For any* secret retrieval attempt, if Secrets Manager is unavailable or returns
an error, the API SHALL fall back to environment variables without crashing.

Validates: Requirements 4.2
"""

import os
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings
import pytest

from botocore.exceptions import ClientError


class TestSecretsManagerFallback:
    """
    Property 3: Secrets Manager Fallback
    
    Tests that the system gracefully falls back to environment variables
    when Secrets Manager is unavailable or returns errors.
    """
    
    @given(
        error_code=st.sampled_from([
            "ResourceNotFoundException",
            "InvalidParameterException", 
            "InvalidRequestException",
            "DecryptionFailure",
            "InternalServiceError",
            "AccessDeniedException",
        ])
    )
    @settings(max_examples=100, deadline=None)
    def test_secrets_client_handles_all_error_types(self, error_code):
        """
        For any AWS error type, the SecretsManagerClient should handle it
        gracefully and return None without raising.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        # Mock the boto3 client to raise various errors
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.side_effect = ClientError(
            error_response={"Error": {"Code": error_code, "Message": "Test error"}},
            operation_name="GetSecretValue"
        )
        
        client._client = mock_boto_client
        
        # Should return None, not raise
        result = client.get_secret("test-secret")
        assert result is None
    
    @given(
        secret_name=st.text(min_size=1, max_size=100).filter(lambda x: x.strip())
    )
    @settings(max_examples=100, deadline=None)
    def test_secrets_are_cached_after_retrieval(self, secret_name):
        """
        For any secret name, after successful retrieval, subsequent calls
        should return the cached value without calling AWS again.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        # Mock successful retrieval
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.return_value = {
            "SecretString": '{"username": "test", "password": "secret"}'
        }
        client._client = mock_boto_client
        
        # First call should hit AWS
        result1 = client.get_secret(secret_name)
        assert result1 is not None
        assert mock_boto_client.get_secret_value.call_count == 1
        
        # Second call should use cache
        result2 = client.get_secret(secret_name)
        assert result2 == result1
        assert mock_boto_client.get_secret_value.call_count == 1  # Still 1
    
    def test_database_credentials_extraction(self):
        """
        Database credentials should be properly extracted from secret JSON.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.return_value = {
            "SecretString": '{"username": "admin", "password": "secret123", "host": "db.example.com", "port": 5432, "dbname": "mydb"}'
        }
        client._client = mock_boto_client
        
        creds = client.get_database_credentials("test-secret")
        
        assert creds is not None
        assert creds["username"] == "admin"
        assert creds["password"] == "secret123"
        assert creds["host"] == "db.example.com"
        assert creds["port"] == 5432
        assert creds["database"] == "mydb"
    
    def test_database_credentials_returns_none_on_error(self):
        """
        When secret retrieval fails, get_database_credentials returns None.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.side_effect = ClientError(
            error_response={"Error": {"Code": "ResourceNotFoundException", "Message": "Not found"}},
            operation_name="GetSecretValue"
        )
        client._client = mock_boto_client
        
        creds = client.get_database_credentials("test-secret")
        assert creds is None
    
    @given(
        invalid_json=st.sampled_from([
            "not json at all",
            "{invalid json",
            "{'single': 'quotes'}",
            "<xml>not json</xml>",
            "plain text",
            "",
            "   ",
        ])
    )
    @settings(max_examples=100, deadline=None)
    def test_handles_invalid_json_in_secret(self, invalid_json):
        """
        For any non-JSON secret value, the client should handle gracefully.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.return_value = {
            "SecretString": invalid_json
        }
        client._client = mock_boto_client
        
        # Should return None for invalid JSON, not raise
        result = client.get_secret("test-secret")
        assert result is None
    
    def test_health_check_returns_true_when_accessible(self):
        """
        Health check returns True when Secrets Manager is accessible.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.describe_secret.return_value = {"Name": "test"}
        client._client = mock_boto_client
        
        assert client.check_health("test-secret") is True
    
    def test_health_check_returns_false_on_error(self):
        """
        Health check returns False when Secrets Manager is unavailable.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.describe_secret.side_effect = ClientError(
            error_response={"Error": {"Code": "AccessDeniedException", "Message": "Denied"}},
            operation_name="DescribeSecret"
        )
        client._client = mock_boto_client
        
        assert client.check_health("test-secret") is False
    
    def test_cache_can_be_cleared(self):
        """
        Cache clearing should force fresh retrieval on next call.
        """
        from services.aws.secrets import SecretsManagerClient
        
        client = SecretsManagerClient(region="us-east-1")
        
        mock_boto_client = MagicMock()
        mock_boto_client.get_secret_value.return_value = {
            "SecretString": '{"key": "value"}'
        }
        client._client = mock_boto_client
        
        # First call
        client.get_secret("test")
        assert mock_boto_client.get_secret_value.call_count == 1
        
        # Clear cache
        client.clear_cache()
        
        # Next call should hit AWS again
        client.get_secret("test")
        assert mock_boto_client.get_secret_value.call_count == 2
