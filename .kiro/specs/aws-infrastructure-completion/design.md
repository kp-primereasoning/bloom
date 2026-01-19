# Design Document: AWS Infrastructure Completion

## Overview

This design document describes the implementation of AWS service integrations for the Bloom platform. The goal is to migrate from local-only development to a cloud-native architecture using AWS Cognito for authentication, S3 for file storage, SES for email, Secrets Manager for credentials, and CloudWatch for logging.

The implementation follows a feature-flag approach, allowing gradual migration from the current custom JWT authentication to Cognito while maintaining backward compatibility.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Auth       │  │   Storage    │  │   Email      │              │
│  │   Module     │  │   Module     │  │   Module     │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐              │
│  │ Cognito      │  │ S3 Client    │  │ SES Client   │              │
│  │ Client       │  │              │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
├─────────┼─────────────────┼─────────────────┼───────────────────────┤
│         │                 │                 │                       │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐              │
│  │ Secrets      │  │ CloudWatch   │  │ Config       │              │
│  │ Manager      │  │ Logger       │  │ Module       │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AWS Services                                 │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┤
│  Cognito    │     S3      │     SES     │  Secrets    │ CloudWatch  │
│  User Pool  │   Bucket    │             │  Manager    │   Logs      │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

## Components and Interfaces

### 1. AWS Configuration Module (`services/aws/config.py`)

Central configuration for all AWS services with feature flags.

```python
from pydantic import BaseSettings
from functools import lru_cache

class AWSSettings(BaseSettings):
    # AWS Core
    aws_region: str = "us-east-1"
    
    # Feature Flags
    use_cognito: bool = False
    use_aws_secrets: bool = False
    use_cloudwatch: bool = False
    
    # Cognito
    cognito_user_pool_id: str = ""
    cognito_client_id: str = ""
    cognito_region: str = "us-east-1"
    
    # S3
    s3_bucket_name: str = "bloom-dev-delivery-photos"
    s3_region: str = "us-east-1"
    
    # SES
    ses_from_email: str = "noreply@bloom.com"
    ses_region: str = "us-east-1"
    
    # Secrets Manager
    db_secret_name: str = "bloom/dev/database"
    
    # CloudWatch
    cloudwatch_log_group: str = "/bloom/dev/api"
    
    class Config:
        env_file = ".env.local"

@lru_cache()
def get_aws_settings() -> AWSSettings:
    return AWSSettings()
```

### 2. Cognito Authentication Module (`services/aws/cognito.py`)

Handles user authentication via AWS Cognito.

```python
import boto3
from jose import jwt, jwk
from jose.utils import base64url_decode
import requests
from functools import lru_cache

class CognitoClient:
    def __init__(self, user_pool_id: str, client_id: str, region: str):
        self.user_pool_id = user_pool_id
        self.client_id = client_id
        self.region = region
        self.client = boto3.client("cognito-idp", region_name=region)
        self._jwks = None
    
    @property
    def jwks_url(self) -> str:
        return f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}/.well-known/jwks.json"
    
    @property
    def issuer(self) -> str:
        return f"https://cognito-idp.{self.region}.amazonaws.com/{self.user_pool_id}"
    
    def get_jwks(self) -> dict:
        """Fetch and cache JWKS for token validation."""
        if self._jwks is None:
            response = requests.get(self.jwks_url)
            self._jwks = response.json()
        return self._jwks
    
    def register(self, email: str, password: str, role: str) -> dict:
        """Register a new user in Cognito."""
        response = self.client.sign_up(
            ClientId=self.client_id,
            Username=email,
            Password=password,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "custom:bloom_role", "Value": role},
            ]
        )
        return {"user_sub": response["UserSub"]}
    
    def login(self, email: str, password: str) -> dict:
        """Authenticate user and return tokens."""
        response = self.client.initiate_auth(
            ClientId=self.client_id,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": password,
            }
        )
        return {
            "access_token": response["AuthenticationResult"]["AccessToken"],
            "id_token": response["AuthenticationResult"]["IdToken"],
            "refresh_token": response["AuthenticationResult"]["RefreshToken"],
            "expires_in": response["AuthenticationResult"]["ExpiresIn"],
        }
    
    def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token using refresh token."""
        response = self.client.initiate_auth(
            ClientId=self.client_id,
            AuthFlow="REFRESH_TOKEN_AUTH",
            AuthParameters={"REFRESH_TOKEN": refresh_token}
        )
        return {
            "access_token": response["AuthenticationResult"]["AccessToken"],
            "id_token": response["AuthenticationResult"]["IdToken"],
            "expires_in": response["AuthenticationResult"]["ExpiresIn"],
        }
    
    def validate_token(self, token: str) -> dict:
        """Validate JWT token against Cognito JWKS."""
        jwks = self.get_jwks()
        headers = jwt.get_unverified_headers(token)
        kid = headers["kid"]
        
        # Find matching key
        key = None
        for k in jwks["keys"]:
            if k["kid"] == kid:
                key = k
                break
        
        if not key:
            raise ValueError("Key not found in JWKS")
        
        # Verify token
        payload = jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=self.client_id,
            issuer=self.issuer,
        )
        return payload
```

### 3. S3 Storage Module (`services/aws/s3.py`)

Handles delivery photo storage with presigned URLs.

```python
import boto3
from botocore.config import Config
from datetime import datetime
import mimetypes

class S3Client:
    def __init__(self, bucket_name: str, region: str):
        self.bucket_name = bucket_name
        self.region = region
        self.client = boto3.client(
            "s3",
            region_name=region,
            config=Config(signature_version="s3v4")
        )
    
    def generate_upload_url(
        self, 
        delivery_id: str, 
        filename: str, 
        expires_in: int = 900  # 15 minutes
    ) -> dict:
        """Generate presigned PUT URL for photo upload."""
        key = f"deliveries/{delivery_id}/{filename}"
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        
        url = self.client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )
        return {"upload_url": url, "key": key, "content_type": content_type}
    
    def generate_download_url(
        self, 
        key: str, 
        expires_in: int = 3600  # 1 hour
    ) -> str:
        """Generate presigned GET URL for photo download."""
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )
    
    def check_health(self) -> bool:
        """Check S3 connectivity by listing bucket."""
        try:
            self.client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=1)
            return True
        except Exception:
            return False
```

### 4. SES Email Module (`services/aws/ses.py`)

Handles transactional email sending.

```python
import boto3
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SESClient:
    def __init__(self, from_email: str, region: str):
        self.from_email = from_email
        self.region = region
        self.client = boto3.client("ses", region_name=region)
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
    ) -> bool:
        """Send transactional email. Returns True on success, False on failure."""
        try:
            self.client.send_email(
                Source=self.from_email,
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Html": {"Data": body_html, "Charset": "UTF-8"},
                        "Text": {"Data": body_text or body_html, "Charset": "UTF-8"},
                    },
                },
            )
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_delivery_scheduled(self, to_email: str, delivery_date: str) -> bool:
        """Send delivery scheduled notification."""
        subject = "Your Bloom Delivery is Scheduled"
        body = f"<p>Your floral delivery is scheduled for {delivery_date}.</p>"
        return self.send_email(to_email, subject, body)
    
    def send_delivery_completed(
        self, 
        to_email: str, 
        photo_url: Optional[str] = None
    ) -> bool:
        """Send delivery completed notification with optional photo."""
        subject = "Your Bloom Delivery Has Arrived!"
        body = "<p>Your floral delivery has been completed.</p>"
        if photo_url:
            body += f'<p><a href="{photo_url}">View delivery photo</a></p>'
        return self.send_email(to_email, subject, body)
    
    def check_health(self) -> bool:
        """Check SES connectivity."""
        try:
            self.client.get_send_quota()
            return True
        except Exception:
            return False
```

### 5. Secrets Manager Module (`services/aws/secrets.py`)

Handles secure credential retrieval.

```python
import boto3
import json
from functools import lru_cache
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SecretsManagerClient:
    def __init__(self, region: str):
        self.region = region
        self.client = boto3.client("secretsmanager", region_name=region)
        self._cache: dict = {}
    
    def get_secret(self, secret_name: str) -> Optional[dict]:
        """Retrieve and cache secret from Secrets Manager."""
        if secret_name in self._cache:
            return self._cache[secret_name]
        
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            secret = json.loads(response["SecretString"])
            self._cache[secret_name] = secret
            return secret
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            return None
    
    def get_database_credentials(self, secret_name: str) -> Optional[dict]:
        """Get database credentials from Secrets Manager."""
        secret = self.get_secret(secret_name)
        if secret:
            return {
                "host": secret.get("host"),
                "port": secret.get("port", 5432),
                "database": secret.get("dbname"),
                "username": secret.get("username"),
                "password": secret.get("password"),
            }
        return None
    
    def check_health(self, secret_name: str) -> bool:
        """Check Secrets Manager connectivity."""
        try:
            self.client.describe_secret(SecretId=secret_name)
            return True
        except Exception:
            return False
```

### 6. CloudWatch Logger (`services/aws/cloudwatch.py`)

Structured logging to CloudWatch.

```python
import logging
import json
import watchtower
from datetime import datetime
from typing import Optional

class CloudWatchHandler:
    def __init__(
        self, 
        log_group: str, 
        region: str, 
        enabled: bool = True
    ):
        self.log_group = log_group
        self.region = region
        self.enabled = enabled
    
    def setup_logging(self, logger_name: str = "bloom") -> logging.Logger:
        """Configure logger with CloudWatch or console handler."""
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.INFO)
        
        # JSON formatter
        formatter = JsonFormatter()
        
        if self.enabled:
            # CloudWatch handler
            handler = watchtower.CloudWatchLogHandler(
                log_group=self.log_group,
                stream_name=datetime.now().strftime("%Y-%m-%d"),
                boto3_client_kwargs={"region_name": self.region},
            )
        else:
            # Console handler for local development
            handler = logging.StreamHandler()
        
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger


class JsonFormatter(logging.Formatter):
    """Format logs as JSON for CloudWatch Insights."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }
        
        # Add request_id if available
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)
```

### 7. Enhanced Health Check (`routes/health.py` updates)

```python
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from services.aws.config import get_aws_settings, AWSSettings
from services.aws.s3 import S3Client
from services.aws.secrets import SecretsManagerClient
from services.aws.cognito import CognitoClient
from db.database import get_db
import asyncio

router = APIRouter(tags=["health"])

@router.get("/health/full")
async def health_full(
    db: Session = Depends(get_db),
    settings: AWSSettings = Depends(get_aws_settings),
):
    """Comprehensive health check for all services."""
    results = {
        "status": "healthy",
        "services": {}
    }
    all_healthy = True
    
    # PostgreSQL check
    try:
        db.execute(text("SELECT 1")).scalar()
        results["services"]["postgresql"] = {"status": "healthy"}
    except Exception as e:
        results["services"]["postgresql"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False
    
    # S3 check
    try:
        s3 = S3Client(settings.s3_bucket_name, settings.s3_region)
        if s3.check_health():
            results["services"]["s3"] = {"status": "healthy"}
        else:
            results["services"]["s3"] = {"status": "unhealthy"}
            all_healthy = False
    except Exception as e:
        results["services"]["s3"] = {"status": "unhealthy", "error": str(e)}
        all_healthy = False
    
    # Cognito check (if enabled)
    if settings.use_cognito:
        try:
            cognito = CognitoClient(
                settings.cognito_user_pool_id,
                settings.cognito_client_id,
                settings.cognito_region,
            )
            cognito.get_jwks()  # Verify we can fetch JWKS
            results["services"]["cognito"] = {"status": "healthy"}
        except Exception as e:
            results["services"]["cognito"] = {"status": "unhealthy", "error": str(e)}
            all_healthy = False
    
    # Secrets Manager check (if enabled)
    if settings.use_aws_secrets:
        try:
            secrets = SecretsManagerClient(settings.aws_region)
            if secrets.check_health(settings.db_secret_name):
                results["services"]["secrets_manager"] = {"status": "healthy"}
            else:
                results["services"]["secrets_manager"] = {"status": "unhealthy"}
                all_healthy = False
        except Exception as e:
            results["services"]["secrets_manager"] = {"status": "unhealthy", "error": str(e)}
            all_healthy = False
    
    if not all_healthy:
        results["status"] = "unhealthy"
        return JSONResponse(status_code=503, content=results)
    
    return results
```

## Data Models

No new database models are required. This implementation adds AWS service clients that work with existing models.

### Environment Variables

```bash
# AWS Core
AWS_REGION=us-east-1

# Feature Flags
USE_COGNITO=false
USE_AWS_SECRETS=false
USE_CLOUDWATCH=false

# Cognito (when USE_COGNITO=true)
COGNITO_USER_POOL_ID=us-east-1_XXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1

# S3
S3_BUCKET_NAME=bloom-dev-delivery-photos
S3_REGION=us-east-1

# SES
SES_FROM_EMAIL=noreply@bloom.com
SES_REGION=us-east-1

# Secrets Manager (when USE_AWS_SECRETS=true)
DB_SECRET_NAME=bloom/dev/database

# CloudWatch (when USE_CLOUDWATCH=true)
CLOUDWATCH_LOG_GROUP=/bloom/dev/api
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token Validation Correctness

*For any* JWT token, if the token has a valid signature from the Cognito JWKS, correct issuer, and correct audience, then validation SHALL succeed; otherwise validation SHALL fail with HTTP 401.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 2: Presigned URL Generation

*For any* delivery ID and filename, the S3 client SHALL generate a presigned URL that follows the pattern `deliveries/{delivery_id}/{filename}` and includes the correct content type based on file extension.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 3: Secrets Manager Fallback

*For any* secret retrieval attempt, if Secrets Manager is unavailable or returns an error, the API SHALL fall back to environment variables without crashing.

**Validates: Requirements 4.2**

### Property 4: Health Check Completeness

*For any* call to `/health/full`, the response SHALL include status for all configured services (PostgreSQL, S3, Cognito if enabled, Secrets Manager if enabled), and SHALL return HTTP 503 if any service is unhealthy.

**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

### Property 5: Feature Flag Behavior

*For any* configuration, when `USE_COGNITO=false` the API SHALL use custom JWT authentication, and when `USE_COGNITO=true` the API SHALL use Cognito authentication.

**Validates: Requirements 10.2, 12.2, 12.3**

### Property 6: Email Failure Resilience

*For any* email send operation, if SES fails, the API SHALL log the error and continue processing the request without returning an error to the client.

**Validates: Requirements 6.4**

### Property 7: CloudWatch Log Format

*For any* log entry when CloudWatch is enabled, the log SHALL be formatted as valid JSON containing timestamp, level, message, and request_id fields.

**Validates: Requirements 7.2, 7.5**

### Property 8: Password Policy Enforcement

*For any* registration attempt with a password that does not meet the policy (12+ chars, uppercase, lowercase, numbers, special chars), registration SHALL fail with an appropriate error.

**Validates: Requirements 2.2**

## Error Handling

### AWS Service Errors

All AWS service calls are wrapped in try/except blocks with appropriate error handling:

1. **Cognito Errors**: Return HTTP 401 for auth failures, HTTP 503 for service unavailable
2. **S3 Errors**: Return HTTP 503 with error details for presigned URL failures
3. **SES Errors**: Log error and continue (non-blocking)
4. **Secrets Manager Errors**: Fall back to environment variables
5. **CloudWatch Errors**: Fall back to console logging

### Error Response Format

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "S3 service is currently unavailable",
    "request_id": "abc-123-def"
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests verify individual components in isolation:

- Cognito token validation with mock JWKS
- S3 presigned URL generation with mocked boto3
- SES email sending with mocked client
- Secrets Manager retrieval with mocked responses
- Configuration loading from environment variables

### Property-Based Tests

Property-based tests verify universal properties using Hypothesis:

- **Token validation**: Generate random valid/invalid tokens and verify correct acceptance/rejection
- **Presigned URLs**: Generate random delivery IDs and filenames, verify URL pattern
- **Feature flags**: Generate random flag combinations, verify correct behavior
- **Health checks**: Generate random service states, verify correct response

### Integration Tests

Integration tests verify end-to-end flows with real AWS services (in dev environment):

- Full authentication flow with Cognito
- Photo upload/download with S3
- Email sending with SES (to verified addresses only)
- Secret retrieval from Secrets Manager

### Test Configuration

```python
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --tb=short

# Property-based test settings
hypothesis_profile = default
```

Property tests should run minimum 100 iterations to ensure coverage.
