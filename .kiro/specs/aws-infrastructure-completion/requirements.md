# Requirements Document

## Introduction

This document specifies the requirements for completing the AWS infrastructure setup for the Bloom platform. Based on analysis of the current codebase, several infrastructure components outlined in `docs/next-steps.md` have not been implemented. This spec covers the remaining AWS services needed to achieve a production-ready cloud architecture.

**Current State Analysis:**
- RDS PostgreSQL: ✅ Implemented (local connection configured)
- JWT Authentication: ✅ Implemented (custom JWT, not Cognito)
- AWS Cognito: ❌ Not implemented
- AWS S3: ❌ Not implemented
- AWS SES: ❌ Not implemented
- AWS Secrets Manager: ❌ Not implemented
- CloudWatch Integration: ❌ Not implemented

**Scope:** This spec covers AWS Cognito for authentication, S3 for file storage, SES for email, Secrets Manager for credentials, and CloudWatch for logging.

## Glossary

- **API_Service**: The FastAPI backend application running in apps/api
- **Cognito_Client**: AWS SDK client for interacting with AWS Cognito User Pools
- **Cognito_User_Pool**: AWS Cognito resource that stores and manages user accounts
- **Secrets_Manager_Client**: AWS SDK client for retrieving secrets from AWS Secrets Manager
- **S3_Client**: AWS SDK client for interacting with Amazon S3
- **SES_Client**: AWS SDK client for sending emails via Amazon SES
- **CloudWatch_Logger**: Logging handler that sends logs to AWS CloudWatch
- **Health_Endpoint**: API endpoint that reports service health status
- **Connection_Test_Script**: Python script that validates connectivity to all AWS services

## Requirements

### Requirement 1: AWS Cognito User Authentication

**User Story:** As a user, I want to authenticate using AWS Cognito, so that my credentials are managed securely by a dedicated identity service.

#### Acceptance Criteria

1. WHEN a user registers, THE Cognito_Client SHALL create a new user in the Cognito_User_Pool with email as username
2. WHEN a user logs in, THE Cognito_Client SHALL authenticate against Cognito and return JWT tokens (ID token, access token, refresh token)
3. THE API_Service SHALL validate incoming JWT tokens against the Cognito_User_Pool's public keys (JWKS)
4. WHEN a user's token expires, THE Cognito_Client SHALL support token refresh using the refresh token
5. THE Cognito_Client SHALL store custom attributes for user role (CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN)

### Requirement 2: Cognito User Pool Configuration

**User Story:** As an administrator, I want Cognito configured with appropriate security settings, so that user accounts are protected.

#### Acceptance Criteria

1. THE Cognito_User_Pool SHALL require email verification before account activation
2. THE Cognito_User_Pool SHALL enforce password policy: minimum 12 characters, uppercase, lowercase, numbers, special characters
3. THE Cognito_User_Pool SHALL support optional MFA via TOTP authenticator app
4. THE Cognito_User_Pool SHALL include custom attributes: bloom_role, property_id, subscription_status
5. WHEN a user requests password reset, THE Cognito_User_Pool SHALL send a verification code via email

### Requirement 3: Cognito Token Validation

**User Story:** As a developer, I want JWT tokens validated against Cognito, so that only authenticated users can access protected endpoints.

#### Acceptance Criteria

1. THE API_Service SHALL fetch and cache Cognito JWKS (JSON Web Key Set) for token validation
2. WHEN validating a token, THE API_Service SHALL verify the token signature using the cached JWKS
3. WHEN validating a token, THE API_Service SHALL verify the token issuer matches the Cognito_User_Pool
4. WHEN validating a token, THE API_Service SHALL verify the token audience matches the app client ID
5. IF token validation fails, THEN THE API_Service SHALL return HTTP 401 with error details

### Requirement 4: AWS Secrets Manager Integration

**User Story:** As a developer, I want the API to retrieve secrets from AWS Secrets Manager, so that credentials are not stored in environment variables or code.

#### Acceptance Criteria

1. WHEN the API_Service starts, THE Secrets_Manager_Client SHALL retrieve database credentials from the secret `bloom/dev/database`
2. IF the Secrets_Manager_Client fails to retrieve a required secret, THEN THE API_Service SHALL log the error and fall back to environment variables
3. WHEN secrets are retrieved, THE API_Service SHALL cache them in memory for the duration of the process
4. THE Secrets_Manager_Client SHALL use IAM role-based authentication when running in AWS, and AWS credentials from environment when running locally

### Requirement 5: Amazon S3 Integration for Delivery Photos

**User Story:** As a florist, I want to upload delivery confirmation photos, so that customers can see proof of delivery.

#### Acceptance Criteria

1. WHEN a photo upload is requested, THE S3_Client SHALL generate a presigned PUT URL valid for 15 minutes
2. WHEN a photo needs to be viewed, THE S3_Client SHALL generate a presigned GET URL valid for 1 hour
3. THE S3_Client SHALL upload photos to the bucket `bloom-dev-delivery-photos` with the key pattern `deliveries/{delivery_id}/{filename}`
4. WHEN uploading, THE S3_Client SHALL set the content type based on the file extension
5. IF the S3_Client fails to generate a presigned URL, THEN THE API_Service SHALL return a 503 error with details

### Requirement 6: Amazon SES Email Integration

**User Story:** As a system administrator, I want the platform to send transactional emails, so that users receive notifications about deliveries and account updates.

#### Acceptance Criteria

1. WHEN a delivery is scheduled, THE SES_Client SHALL send a notification email to the customer
2. WHEN a delivery is completed, THE SES_Client SHALL send a confirmation email with photo link to the customer
3. THE SES_Client SHALL send emails from the verified sender address `noreply@bloom.com`
4. IF the SES_Client fails to send an email, THEN THE API_Service SHALL log the error and continue operation without failing the request
5. WHILE in development mode, THE SES_Client SHALL only send to verified email addresses (SES sandbox limitation)

### Requirement 7: CloudWatch Logging Integration

**User Story:** As a developer, I want application logs sent to CloudWatch, so that I can monitor and debug the production system.

#### Acceptance Criteria

1. WHEN the API_Service runs in AWS, THE CloudWatch_Logger SHALL send logs to the log group `/bloom/dev/api`
2. THE CloudWatch_Logger SHALL include the request ID in all log entries for tracing
3. THE CloudWatch_Logger SHALL log at INFO level for normal operations and ERROR level for exceptions
4. WHEN running locally, THE CloudWatch_Logger SHALL fall back to console logging
5. THE CloudWatch_Logger SHALL format logs as JSON for structured querying in CloudWatch Insights

### Requirement 8: Health Check Enhancements

**User Story:** As a DevOps engineer, I want comprehensive health checks, so that I can monitor all service dependencies.

#### Acceptance Criteria

1. WHEN `/health/full` is called, THE Health_Endpoint SHALL check connectivity to RDS PostgreSQL
2. WHEN `/health/full` is called, THE Health_Endpoint SHALL check connectivity to AWS Cognito by describing the user pool
3. WHEN `/health/full` is called, THE Health_Endpoint SHALL check connectivity to AWS S3 by listing bucket contents
4. WHEN `/health/full` is called, THE Health_Endpoint SHALL check connectivity to AWS Secrets Manager by describing a secret
5. THE Health_Endpoint SHALL return a JSON response with status for each service
6. IF any service check fails, THEN THE Health_Endpoint SHALL return HTTP 503 with details of failed services
7. THE Health_Endpoint SHALL complete all checks within 10 seconds timeout

### Requirement 9: Connection Test Script

**User Story:** As a developer, I want a script to test all AWS connections, so that I can verify infrastructure setup before development.

#### Acceptance Criteria

1. WHEN the Connection_Test_Script runs, THE script SHALL test RDS PostgreSQL connectivity by executing a simple query
2. WHEN the Connection_Test_Script runs, THE script SHALL test Cognito connectivity by describing the user pool
3. WHEN the Connection_Test_Script runs, THE script SHALL test S3 connectivity by writing and reading a test object
4. WHEN the Connection_Test_Script runs, THE script SHALL test Secrets Manager connectivity by retrieving a secret
5. WHEN the Connection_Test_Script runs, THE script SHALL test SES connectivity by calling the SES API (without sending)
6. THE Connection_Test_Script SHALL output a clear pass/fail status for each service with emoji indicators
7. IF any test fails, THEN THE Connection_Test_Script SHALL exit with a non-zero status code

### Requirement 10: Environment Configuration

**User Story:** As a developer, I want clear environment configuration, so that I can easily switch between local and cloud development.

#### Acceptance Criteria

1. THE API_Service SHALL support configuration via environment variables for all AWS services
2. THE API_Service SHALL support a `USE_COGNITO` flag to toggle between Cognito and local JWT authentication
3. THE API_Service SHALL support a `USE_AWS_SECRETS` flag to toggle Secrets Manager usage
4. THE API_Service SHALL support a `USE_CLOUDWATCH` flag to toggle CloudWatch logging
5. WHEN `ENVIRONMENT=development`, THE API_Service SHALL use more permissive defaults for local development
6. THE API_Service SHALL validate required configuration on startup and fail fast with clear error messages

### Requirement 11: AWS SDK Dependencies

**User Story:** As a developer, I want proper AWS SDK setup, so that all AWS services can be accessed consistently.

#### Acceptance Criteria

1. THE API_Service SHALL use boto3 for all AWS service interactions
2. THE API_Service SHALL configure boto3 with the region from `AWS_REGION` environment variable
3. WHEN running locally, THE API_Service SHALL use AWS credentials from environment variables or AWS CLI profile
4. WHEN running in AWS, THE API_Service SHALL use IAM role-based authentication automatically
5. THE API_Service SHALL handle AWS SDK exceptions gracefully with appropriate error responses

### Requirement 12: Migration from Custom JWT to Cognito

**User Story:** As a developer, I want a clear migration path from custom JWT to Cognito, so that existing functionality continues to work during transition.

#### Acceptance Criteria

1. THE API_Service SHALL support both custom JWT and Cognito authentication simultaneously during migration
2. WHEN `USE_COGNITO=false`, THE API_Service SHALL use the existing custom JWT authentication
3. WHEN `USE_COGNITO=true`, THE API_Service SHALL use Cognito for all authentication
4. THE API_Service SHALL provide a script to migrate existing users from the database to Cognito
5. THE migration script SHALL preserve user roles and property associations when creating Cognito users
