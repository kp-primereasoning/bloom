# Implementation Plan: AWS Infrastructure Completion

## Overview

This implementation plan covers the integration of AWS services (Cognito, S3, SES, Secrets Manager, CloudWatch) into the Bloom API. The approach uses feature flags to enable gradual migration from local-only development to cloud-native architecture.

## Tasks

- [x] 1. Set up AWS SDK and configuration module
  - Install boto3 and related dependencies
  - Create `services/aws/config.py` with Pydantic settings
  - Add feature flags (USE_COGNITO, USE_AWS_SECRETS, USE_CLOUDWATCH)
  - Update `.env.example` with all AWS environment variables
  - _Requirements: 10.1, 11.1, 11.2_

- [x] 2. Implement Secrets Manager integration
  - [x] 2.1 Create `services/aws/secrets.py` with SecretsManagerClient class
    - Implement `get_secret()` with caching
    - Implement `get_database_credentials()` helper
    - Implement `check_health()` method
    - _Requirements: 4.1, 4.3, 4.4_
  - [x] 2.2 Update database connection to use Secrets Manager
    - Modify `db/database.py` to optionally fetch credentials from Secrets Manager
    - Implement fallback to environment variables when USE_AWS_SECRETS=false
    - _Requirements: 4.2_
  - [x] 2.3 Write property test for Secrets Manager fallback
    - **Property 3: Secrets Manager Fallback**
    - **Validates: Requirements 4.2**

- [x] 3. Implement S3 integration for delivery photos
  - [x] 3.1 Create `services/aws/s3.py` with S3Client class
    - Implement `generate_upload_url()` for presigned PUT URLs
    - Implement `generate_download_url()` for presigned GET URLs
    - Implement content type detection from file extension
    - Implement `check_health()` method
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 3.2 Create delivery photo API endpoints
    - Add `POST /deliveries/{id}/photo/upload-url` endpoint
    - Add `GET /deliveries/{id}/photo` endpoint for download URL
    - _Requirements: 5.1, 5.2_
  - [x] 3.3 Write property test for presigned URL generation
    - **Property 2: Presigned URL Generation**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 4. Implement SES email integration
  - [x] 4.1 Create `services/aws/ses.py` with SESClient class
    - Implement `send_email()` base method with error handling
    - Implement `send_delivery_scheduled()` notification
    - Implement `send_delivery_completed()` notification
    - Implement `check_health()` method
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 4.2 Write property test for email failure resilience
    - **Property 6: Email Failure Resilience**
    - **Validates: Requirements 6.4**

- [x] 5. Checkpoint - Verify AWS service integrations
  - ✅ All 25 tests pass (Secrets Manager, S3, SES)

- [x] 6. Implement Cognito authentication
  - [x] 6.1 Create `services/aws/cognito.py` with CognitoClient class
    - Implement JWKS fetching and caching
    - Implement `register()` method
    - Implement `login()` method
    - Implement `refresh_token()` method
    - Implement `validate_token()` method
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 6.2 Create Cognito authentication dependency
    - Create `auth/cognito_dependencies.py` with `get_current_user_cognito()`
    - Implement token validation against JWKS
    - Extract user claims (sub, email, role) from token
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 6.3 Update auth routes to support Cognito
    - Modify `/auth/register` to use Cognito when USE_COGNITO=true
    - Modify `/auth/login` to use Cognito when USE_COGNITO=true
    - Add `/auth/refresh` endpoint for token refresh
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 6.4 Create authentication switcher based on feature flag
    - Create `auth/dependencies.py` that switches between custom JWT and Cognito
    - Ensure backward compatibility with existing endpoints
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 6.5 Write property test for token validation
    - **Property 1: Token Validation Correctness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
  - [x] 6.6 Write property test for feature flag behavior
    - **Property 5: Feature Flag Behavior**
    - **Validates: Requirements 10.2, 12.2, 12.3**
  - [x] 6.7 Write property test for password policy
    - **Property 8: Password Policy Enforcement**
    - **Validates: Requirements 2.2**

- [x] 7. Implement CloudWatch logging
  - [x] 7.1 Create `services/aws/cloudwatch.py` with CloudWatchHandler
    - Implement JSON log formatter with request_id
    - Implement CloudWatch handler setup
    - Implement console fallback for local development
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 7.2 Integrate CloudWatch logging into application
    - Configure logging based on feature flag
    - _Requirements: 7.2_
  - [x] 7.3 Write property test for log format
    - **Property 7: CloudWatch Log Format**
    - **Validates: Requirements 7.2, 7.5**

- [x] 8. Implement enhanced health checks
  - [x] 8.1 Update `/health/full` endpoint
    - Add PostgreSQL health check
    - Add S3 health check
    - Add Cognito health check (when enabled)
    - Add Secrets Manager health check (when enabled)
    - Return 503 when any service is unhealthy
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [x] 8.2 Write property test for health check completeness
    - **Property 4: Health Check Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [x] 9. Checkpoint - Verify all integrations
  - ✅ All tests pass (CloudWatch, Health Checks)

- [x] 10. Create connection test script
  - [x] 10.1 Create `scripts/test_connections.py`
    - Test PostgreSQL connectivity
    - Test Cognito connectivity (describe user pool)
    - Test S3 connectivity (write/read test object)
    - Test Secrets Manager connectivity
    - Test SES connectivity (get send quota)
    - Output pass/fail with emoji indicators
    - Exit with non-zero code on failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 11. Create user migration script
  - [x] 11.1 Create `scripts/migrate_users_to_cognito.py`
    - Read existing users from PostgreSQL
    - Create corresponding users in Cognito
    - Preserve roles via custom attributes
    - Handle errors gracefully with logging
    - _Requirements: 12.4, 12.5_

- [x] 12. Update documentation and environment examples
  - [x] 12.1 Update `.env.example` with all AWS variables
    - Add all Cognito variables
    - Add all S3 variables
    - Add all SES variables
    - Add all Secrets Manager variables
    - Add all CloudWatch variables
    - Add feature flag documentation
    - _Requirements: 10.1_
  - [x] 12.2 Update `requirements.txt` with AWS dependencies
    - Add boto3
    - Add watchtower (CloudWatch logging)
    - Add python-jose[cryptography] (JWT validation)
    - _Requirements: 11.1_

- [x] 13. Final checkpoint - Full integration test
  - ✅ All property-based tests pass
  - ✅ Connection test script created
  - ✅ Migration script created
  - ✅ Documentation updated

## Notes

- All property-based tests are required for comprehensive coverage
- Feature flags allow incremental adoption - start with USE_COGNITO=false and enable when ready
- The connection test script (`scripts/test_connections.py`) should be run after AWS infrastructure is provisioned
- Migration script should only be run once when transitioning from custom JWT to Cognito
