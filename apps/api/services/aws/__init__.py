"""
AWS service integrations for the Bloom API.

This module provides clients for AWS services:
- Cognito: User authentication
- S3: File storage for delivery photos
- SES: Transactional email
- Secrets Manager: Secure credential storage
- CloudWatch: Structured logging
"""

from services.aws.config import get_aws_settings, AWSSettings, validate_aws_config
from services.aws.s3 import S3Client, get_s3_client
from services.aws.ses import SESClient, get_ses_client
from services.aws.secrets import SecretsManagerClient, get_secrets_client
from services.aws.cognito import CognitoClient, get_cognito_client
from services.aws.cloudwatch import configure_logging, setup_cloudwatch_logging, setup_console_logging

__all__ = [
    # Config
    "get_aws_settings",
    "AWSSettings",
    "validate_aws_config",
    # S3
    "S3Client",
    "get_s3_client",
    # SES
    "SESClient",
    "get_ses_client",
    # Secrets Manager
    "SecretsManagerClient",
    "get_secrets_client",
    # Cognito
    "CognitoClient",
    "get_cognito_client",
    # CloudWatch
    "configure_logging",
    "setup_cloudwatch_logging",
    "setup_console_logging",
]
