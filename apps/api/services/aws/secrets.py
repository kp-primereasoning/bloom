"""
AWS Secrets Manager client for secure credential retrieval.

This module provides a client for retrieving secrets from AWS Secrets Manager
with caching and fallback to environment variables.
"""

import json
import logging
from typing import Optional, Dict, Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class SecretsManagerClient:
    """
    Client for AWS Secrets Manager with caching.
    
    Secrets are cached in memory for the lifetime of the client instance
    to minimize API calls and improve performance.
    """
    
    def __init__(self, region: str):
        """
        Initialize Secrets Manager client.
        
        Args:
            region: AWS region for Secrets Manager
        """
        self.region = region
        self._client = None
        self._cache: Dict[str, Any] = {}
    
    @property
    def client(self):
        """Lazy initialization of boto3 client."""
        if self._client is None:
            self._client = boto3.client("secretsmanager", region_name=self.region)
        return self._client
    
    def get_secret(self, secret_name: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """
        Retrieve a secret from Secrets Manager.
        
        Args:
            secret_name: Name or ARN of the secret
            use_cache: Whether to use cached value if available
            
        Returns:
            Parsed secret value as dict, or None if retrieval fails
        """
        # Check cache first
        if use_cache and secret_name in self._cache:
            logger.debug(f"Returning cached secret: {secret_name}")
            return self._cache[secret_name]
        
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            
            # Parse secret string as JSON
            secret_string = response.get("SecretString")
            if secret_string:
                secret = json.loads(secret_string)
                self._cache[secret_name] = secret
                logger.info(f"Successfully retrieved secret: {secret_name}")
                return secret
            
            # Handle binary secrets (not typical for our use case)
            logger.warning(f"Secret {secret_name} is binary, not string")
            return None
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            logger.error(f"Failed to retrieve secret {secret_name}: {error_code} - {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse secret {secret_name} as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error retrieving secret {secret_name}: {e}")
            return None
    
    def get_database_credentials(self, secret_name: str) -> Optional[Dict[str, Any]]:
        """
        Get database credentials from Secrets Manager.
        
        Args:
            secret_name: Name of the database secret
            
        Returns:
            Dict with host, port, database, username, password or None
        """
        secret = self.get_secret(secret_name)
        if not secret:
            return None
        
        return {
            "host": secret.get("host"),
            "port": secret.get("port", 5432),
            "database": secret.get("dbname") or secret.get("database"),
            "username": secret.get("username"),
            "password": secret.get("password"),
        }
    
    def check_health(self, secret_name: str) -> bool:
        """
        Check Secrets Manager connectivity by describing a secret.
        
        Args:
            secret_name: Name of secret to check
            
        Returns:
            True if Secrets Manager is accessible, False otherwise
        """
        try:
            self.client.describe_secret(SecretId=secret_name)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            # ResourceNotFoundException means the secret doesn't exist but SM is accessible
            if error_code == "ResourceNotFoundException":
                logger.warning(f"Secret {secret_name} not found, but Secrets Manager is accessible")
                return True
            logger.error(f"Secrets Manager health check failed: {error_code}")
            return False
        except Exception as e:
            logger.error(f"Secrets Manager health check failed: {e}")
            return False
    
    def clear_cache(self):
        """Clear the secrets cache."""
        self._cache.clear()
        logger.info("Secrets cache cleared")


# Module-level singleton instance (lazy initialized)
_secrets_client: Optional[SecretsManagerClient] = None


def get_secrets_client(region: str = "us-east-1") -> SecretsManagerClient:
    """
    Get or create the Secrets Manager client singleton.
    
    Args:
        region: AWS region for Secrets Manager
        
    Returns:
        SecretsManagerClient instance
    """
    global _secrets_client
    if _secrets_client is None:
        _secrets_client = SecretsManagerClient(region)
    return _secrets_client
