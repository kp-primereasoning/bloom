# Requirements Document

## Introduction

This specification covers production hardening and operational improvements for the Bloom platform (Slice 3). The focus is on making the system usable day-to-day and safer in production through observability, data integrity safeguards, improved local development experience, and documented deployment workflows.

## Glossary

- **API**: The FastAPI backend service running on AWS App Runner
- **Web**: The React frontend application hosted on AWS Amplify
- **Request_ID**: A unique identifier assigned to each API request for tracing
- **Error_Envelope**: Standardized JSON structure for error responses
- **Health_Check**: Endpoint that verifies service and dependency availability
- **Soft_Delete**: Marking records as archived/inactive instead of removing from database
- **Seed_Data**: Pre-populated demo data for development and testing
- **PM**: Property Manager role

## Requirements

### Requirement 1: Request ID Logging

**User Story:** As a developer, I want every API request to have a unique request_id, so that I can trace issues across logs and correlate errors with specific requests.

#### Acceptance Criteria

1. WHEN an API request is received, THE API SHALL generate a unique request_id (UUID format)
2. WHEN the API logs any message during request processing, THE API SHALL include the request_id in the log entry
3. WHEN the API returns an error response, THE Error_Envelope SHALL include the request_id field
4. WHEN a client provides an X-Request-ID header, THE API SHALL use that value as the request_id instead of generating a new one

### Requirement 2: Database Health Check Endpoint

**User Story:** As an operations engineer, I want a dedicated health check endpoint that verifies database connectivity, so that load balancers and monitoring can detect database issues.

#### Acceptance Criteria

1. THE API SHALL expose a GET /health/db endpoint
2. WHEN the database connection is healthy and a simple query succeeds, THE Health_Check SHALL return HTTP 200 with status "healthy"
3. WHEN the database connection fails or query times out, THE Health_Check SHALL return HTTP 503 with status "unhealthy" and error details
4. THE Health_Check SHALL complete within 5 seconds or return unhealthy status

### Requirement 3: Error Tracking Integration

**User Story:** As a developer, I want unhandled exceptions to be captured and reported, so that I can identify and fix production issues quickly.

#### Acceptance Criteria

1. WHEN an unhandled exception occurs in the API, THE API SHALL report it to the error tracking service (Sentry or CloudWatch)
2. WHEN an unhandled exception occurs in the Web app, THE Web SHALL report it to the error tracking service
3. WHEN an error is reported, THE Error_Tracking SHALL include request_id, user context, and stack trace
4. IF Sentry is not configured, THEN THE API SHALL log errors to CloudWatch with sufficient detail for debugging

### Requirement 4: Server-Side Validation for Admin Mutations

**User Story:** As a system administrator, I want all admin mutations validated on the server, so that data integrity is enforced regardless of client behavior.

#### Acceptance Criteria

1. WHEN creating a user, THE API SHALL validate email format, role validity, and required fields server-side
2. WHEN updating a property, THE API SHALL validate all field constraints server-side
3. WHEN assigning a PM to a property, THE API SHALL verify the user has PM role before allowing assignment
4. WHEN assigning a florist to a property, THE API SHALL verify the florist exists and is active
5. IF validation fails, THEN THE API SHALL return HTTP 400/422 with specific error details in the Error_Envelope

### Requirement 5: Database-Level Unique Email Constraint

**User Story:** As a system administrator, I want email uniqueness enforced at the database level, so that duplicate emails cannot be created even under race conditions.

#### Acceptance Criteria

1. THE Database SHALL have a unique constraint on user.email column
2. WHEN attempting to create a user with a duplicate email, THE API SHALL return HTTP 409 Conflict with clear error message
3. THE unique constraint SHALL be verified to exist in the current schema

### Requirement 6: Property Manager Assignment Rules

**User Story:** As a system administrator, I want PM assignment rules enforced, so that only valid PM users can be assigned to properties.

#### Acceptance Criteria

1. WHEN assigning a user as PM to a property, THE API SHALL verify the user has role "pm"
2. IF a non-PM user is assigned as PM, THEN THE API SHALL return HTTP 400 with error "User must have PM role"
3. WHEN a PM assignment is created, THE API SHALL record it in the property_assignments table with type "pm"

### Requirement 7: Soft Delete Implementation

**User Story:** As a system administrator, I want records to be archived instead of deleted, so that data can be recovered and audit trails are preserved.

#### Acceptance Criteria

1. WHEN a user is "deleted", THE API SHALL set status to "ARCHIVED" instead of removing the record
2. WHEN a property is "deleted", THE API SHALL set status to "ARCHIVED" instead of removing the record
3. WHEN a florist is "deleted", THE API SHALL set status to "ARCHIVED" instead of removing the record
4. WHEN listing entities, THE API SHALL exclude ARCHIVED records by default
5. WHERE an admin requests archived records, THE API SHALL include them in the response

### Requirement 8: Realistic Demo Seed Data

**User Story:** As a developer, I want realistic demo data seeded quickly, so that I can test features with representative scenarios.

#### Acceptance Criteria

1. WHEN running seed, THE Seed_Data SHALL create 5 properties with varied statuses
2. WHEN running seed, THE Seed_Data SHALL create 3 florists with active status
3. WHEN running seed, THE Seed_Data SHALL create 2 PM users and assign them to properties
4. WHEN running seed, THE Seed_Data SHALL create 30 customer users distributed across properties with CREATED/ACTIVE/PAUSED mix
5. WHEN running seed multiple times, THE Seed_Data SHALL be idempotent (no duplicates, same result)
6. THE Seed_Data SHALL complete in under 10 seconds

### Requirement 9: Deployment Documentation

**User Story:** As a developer, I want clear deployment documentation, so that I can deploy changes safely and consistently.

#### Acceptance Criteria

1. THE Documentation SHALL describe the exact deploy workflow for API (App Runner)
2. THE Documentation SHALL describe the exact deploy workflow for Web (Amplify)
3. THE Documentation SHALL specify which steps are automatic vs manual
4. THE Documentation SHALL document required environment variables for each environment
5. THE Documentation SHALL include database migration workflow (when/how migrations run)
6. THE Documentation SHALL include verification steps for post-deployment checks
