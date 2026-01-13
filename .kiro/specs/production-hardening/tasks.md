# Implementation Plan: Production Hardening

## Overview

Implementation of production hardening features for the Bloom platform including observability, data integrity, improved seeding, and deployment documentation.

## Tasks

- [x] 1. Implement Request ID Middleware and Logging
  - [x] 1.1 Create request ID middleware with contextvars
    - Create `apps/api/middleware/request_id.py`
    - Generate UUID for each request or use X-Request-ID header
    - Store in contextvars for thread-safe access
    - Add X-Request-ID to response headers
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 Update exception handlers to include request_id
    - Modify `apps/api/middleware/exceptions.py`
    - Import get_request_id from request_id middleware
    - Include request_id in all error envelope responses
    - _Requirements: 1.3_
  - [x] 1.3 Register middleware in main.py
    - Add RequestIDMiddleware to FastAPI app
    - Ensure middleware runs before route handlers
    - _Requirements: 1.1_
  - [x] 1.4 Write property test for request ID propagation
    - **Property 1: Request ID Propagation**
    - **Validates: Requirements 1.1, 1.4**

- [x] 2. Implement Database Health Check Endpoint
  - [x] 2.1 Create health routes module
    - Create `apps/api/routes/health.py`
    - Implement GET /health/db endpoint
    - Execute SELECT 1 query with 5s timeout
    - Return 200/healthy or 503/unhealthy
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 2.2 Register health router in main.py
    - Import and include health router
    - _Requirements: 2.1_
  - [x] 2.3 Write unit test for health check endpoint
    - Test healthy response with working DB
    - _Requirements: 2.2_

- [x] 3. Implement Error Tracking Integration
  - [x] 3.1 Add Sentry SDK to requirements
    - Add sentry-sdk[fastapi] to requirements.txt
    - _Requirements: 3.1_
  - [x] 3.2 Initialize Sentry in main.py
    - Check for SENTRY_DSN environment variable
    - Initialize with FastAPI integration
    - Include request_id in error context
    - _Requirements: 3.1, 3.3_
  - [x] 3.3 Update generic exception handler for Sentry
    - Capture exceptions to Sentry if configured
    - Include request_id and user context
    - _Requirements: 3.3_

- [x] 4. Checkpoint - Verify observability features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Soft Delete for Entities
  - [x] 5.1 Add ARCHIVED status to User model
    - Add UserStatus enum with ACTIVE/ARCHIVED
    - Add status field to User model
    - Default to ACTIVE
    - _Requirements: 7.1_
  - [x] 5.2 Add ARCHIVED status to Property model
    - Update PropertyStatus enum to include ARCHIVED
    - Create migration for enum update
    - _Requirements: 7.2_
  - [x] 5.3 Add ARCHIVED status to Florist model
    - Update FloristStatus enum to include ARCHIVED
    - Create migration for enum update
    - _Requirements: 7.3_
  - [x] 5.4 Update list queries to exclude ARCHIVED by default
    - Modify get_properties to filter out ARCHIVED
    - Modify get_florists to filter out ARCHIVED
    - Modify get_all_users to filter out ARCHIVED
    - Add include_archived query parameter
    - _Requirements: 7.4, 7.5_
  - [x] 5.5 Implement soft delete endpoints
    - Add DELETE /admin/users/{id} that sets ARCHIVED
    - Add DELETE /admin/properties/{id} that sets ARCHIVED
    - Add DELETE /admin/florists/{id} that sets ARCHIVED
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 5.6 Write property test for soft delete behavior
    - **Property 5: Soft Delete Behavior**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 6. Verify and Enhance Server-Side Validation
  - [x] 6.1 Verify email uniqueness constraint at DB level
    - Check if unique constraint exists on users table
    - Note: Users are in-memory, so verify application-level enforcement
    - _Requirements: 5.1, 5.3_
  - [x] 6.2 Ensure 409 Conflict for duplicate emails
    - Verify create_user_endpoint returns 409 for duplicates
    - _Requirements: 5.2_
  - [x] 6.3 Verify PM role validation on assignment
    - Verify assign_property_manager validates PM role
    - Verify error message matches spec
    - _Requirements: 6.1, 6.2_
  - [x] 6.4 Verify florist existence validation on assignment
    - Verify create_assignment validates florist exists
    - _Requirements: 4.4_
  - [x] 6.5 Write property test for validation rejection
    - **Property 8: Server-Side Validation**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 7. Checkpoint - Verify data integrity features
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Enhance Seed Data
  - [x] 8.1 Update seed configuration for realistic data
    - Define 5 properties with varied statuses
    - Define 3 florists (all READY status)
    - Define 2 PM users with property assignments
    - Define 30 customers with status distribution (10 CREATED, 15 ACTIVE, 5 PAUSED)
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 8.2 Implement idempotent seeding logic
    - Check for existing data before inserting
    - Use deterministic IDs or email-based deduplication
    - Ensure seed can run multiple times safely
    - _Requirements: 8.5_
  - [x] 8.3 Create property-florist assignments in seed
    - Assign florists to properties
    - Ensure status computation triggers correctly
    - _Requirements: 8.1_
  - [x] 8.4 Write property test for seed idempotence
    - **Property 7: Seed Idempotence**
    - **Validates: Requirements 8.5**

- [x] 9. Update Deployment Documentation
  - [x] 9.1 Document API deployment workflow
    - App Runner auto-deploy from main branch
    - Manual deployment steps if needed
    - Environment variables required
    - _Requirements: 9.1, 9.4_
  - [x] 9.2 Document Web deployment workflow
    - Amplify auto-deploy from main branch
    - Build settings and environment variables
    - _Requirements: 9.2, 9.4_
  - [x] 9.3 Document database migration workflow
    - When migrations run (startup)
    - How to run manually
    - Rollback procedures
    - _Requirements: 9.5_
  - [x] 9.4 Add post-deployment verification checklist
    - Health check endpoints to verify
    - Smoke test procedures
    - _Requirements: 9.6_

- [x] 10. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Run full test suite
  - Verify seed creates expected data
  - Test health endpoints locally

- [x] 11. Update Changelog
  - Add entry for production hardening features
  - List all new endpoints and capabilities

## Notes

- All tasks including property-based tests are required
- Users are currently stored in-memory, so DB constraints don't apply directly
- Sentry integration is optional - falls back to CloudWatch logging
- Seed data should be deterministic for reproducibility
