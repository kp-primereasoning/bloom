"""
AWS configuration module with feature flags for gradual migration.

This module provides centralized configuration for all AWS services
with feature flags to enable/disable individual integrations.
"""

import os
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class AWSSettings(BaseSettings):
    """
    AWS service configuration with feature flags.
    
    Feature flags allow gradual migration from local-only to cloud-native:
    - USE_COGNITO: Toggle between custom JWT and Cognito authentication
    - USE_AWS_SECRETS: Toggle Secrets Manager for credential retrieval
    - USE_CLOUDWATCH: Toggle CloudWatch logging
    """
    
    # AWS Core Configuration
    aws_region: str = "us-east-1"
    
    # Feature Flags (all disabled by default for local development)
    use_cognito: bool = False
    use_aws_secrets: bool = False
    use_cloudwatch: bool = False
    
    # Cognito Configuration
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    cognito_region: str = "us-east-1"
    
    # S3 Configuration
    s3_bucket_name: str = "bloom-dev-delivery-photos"
    s3_region: str = "us-east-1"
    
    # SES Configuration
    ses_from_email: str = "noreply@bloom.com"
    ses_region: str = "us-east-1"
    
    # Secrets Manager Configuration
    db_secret_name: str = "bloom/dev/database"
    jwt_secret_name: str = "bloom/dev/jwt-secret"
    
    # CloudWatch Configuration
    cloudwatch_log_group: str = "/bloom/dev/api"
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_aws_settings() -> AWSSettings:
    """
    Get cached AWS settings instance.
    
    Settings are loaded once and cached for the lifetime of the process.
    Uses environment variables with fallback to .env.local file.
    """
    return AWSSettings()


def validate_aws_config() -> dict:
    """
    Validate AWS configuration and return status for each service.
    
    Returns a dict with validation status for each AWS service.
    Useful for startup checks and debugging.
    """
    settings = get_aws_settings()
    validation = {
        "cognito": {
            "enabled": settings.use_cognito,
            "configured": bool(settings.cognito_user_pool_id and settings.cognito_client_id),
        },
        "s3": {
            "enabled": True,  # S3 is always available
            "configured": bool(settings.s3_bucket_name),
        },
        "ses": {
            "enabled": True,  # SES is always available
            "configured": bool(settings.ses_from_email),
        },
        "secrets_manager": {
            "enabled": settings.use_aws_secrets,
            "configured": bool(settings.db_secret_name),
        },
        "cloudwatch": {
            "enabled": settings.use_cloudwatch,
            "configured": bool(settings.cloudwatch_log_group),
        },
    }
    
    # Check for missing required config when features are enabled
    errors = []
    if settings.use_cognito and not validation["cognito"]["configured"]:
        errors.append("Cognito enabled but COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID not set")
    
    if settings.use_aws_secrets and not validation["secrets_manager"]["configured"]:
        errors.append("AWS Secrets enabled but DB_SECRET_NAME not set")
    
    validation["errors"] = errors
    validation["valid"] = len(errors) == 0
    
    return validation
