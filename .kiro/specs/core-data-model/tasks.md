# Implementation Plan: Core Data Model + AWS-Backed Persistence

## Overview

This implementation plan covers setting up the database infrastructure, creating ORM models, implementing migrations, and building admin API endpoints for the core domain entities (Property, Florist, PropertyAssignment).

## Tasks

- [x] 1. Set up database infrastructure and dependencies
  - [x] 1.1 Add SQLAlchemy, Alembic, and psycopg2 dependencies to requirements.txt
    - Add sqlalchemy, alembic, psycopg2-binary packages
    - _Requirements: 6.4, 7.1_
  - [x] 1.2 Create database connection module (`apps/api/db/database.py`)
    - Implement connection URL from environment variables (DATABASE_URL or components)
    - Create engine, SessionLocal, Base, and get_db dependency
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 1.3 Initialize Alembic configuration
    - Run `alembic init alembic` in apps/api
    - Configure alembic.ini and env.py for async support
    - _Requirements: 7.1_

- [x] 2. Create ORM models for core entities
  - [x] 2.1 Create Property model (`apps/api/models/property.py`)
    - Define PropertyStatus enum (DRAFT, SUBMITTED, ACTIVE)
    - Define Property SQLAlchemy model with all fields
    - Configure updated_at with ORM-level onupdate
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 2.2 Create Florist model (`apps/api/models/florist.py`)
    - Define FloristStatus enum (ONBOARDING, READY)
    - Define Florist SQLAlchemy model with all fields
    - _Requirements: 2.1, 2.2_
  - [x] 2.3 Create PropertyAssignment model (`apps/api/models/property_assignment.py`)
    - Define PropertyAssignment SQLAlchemy model with foreign keys
    - Add partial unique index for single active assignment per property
    - _Requirements: 3.1, 5.1, 5.3_
  - [x] 2.4 Update models/__init__.py to export all models
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 3. Create initial database migration
  - [x] 3.1 Create migration for core tables (`alembic/versions/001_create_core_tables.py`)
    - Enable pgcrypto extension
    - Create properties table with enum and constraints
    - Create florists table with enum
    - Create property_assignments table with foreign keys
    - Create partial unique index for active assignments
    - _Requirements: 7.2, 7.4, 7.5, 7.6_
  - [x] 3.2 Test migration runs cleanly against empty database
    - Verify upgrade and downgrade work correctly
    - _Requirements: 7.2, 7.3_

- [x] 4. Checkpoint - Database setup complete
  - Ensure migrations run successfully
  - Verify database connection works
  - Ask the user if questions arise

- [x] 5. Create Pydantic schemas for API requests/responses
  - [x] 5.1 Create domain schemas (`apps/api/schemas/domain.py`)
    - PropertyCreate, PropertyUpdate, PropertyResponse
    - FloristCreate, FloristResponse
    - PropertyAssignmentCreate, PropertyAssignmentResponse
    - _Requirements: 8.1, 9.1, 10.1_

- [x] 6. Implement service layer with business logic
  - [x] 6.1 Create property service (`apps/api/services/property_service.py`)
    - Implement create_property (always DRAFT)
    - Implement get_properties, get_property
    - Implement update_property with status transition validation
    - _Requirements: 1.3, 4.1, 4.2, 4.3, 8.1, 8.2_
  - [x] 6.2 Write property test for status transition rules
    - **Property 3: Status Transition Rules**
    - Test DRAFT→SUBMITTED allowed, SUBMITTED→ACTIVE requires assignment, DRAFT→ACTIVE forbidden
    - **Validates: Requirements 4.1, 4.2, 4.3**
  - [x] 6.3 Create florist service (`apps/api/services/florist_service.py`)
    - Implement create_florist (always ONBOARDING)
    - Implement get_florists, get_florist
    - _Requirements: 2.3, 9.1, 9.2_
  - [x] 6.4 Create assignment service (`apps/api/services/assignment_service.py`)
    - Implement create_assignment with deactivation of existing
    - Validate property_id and florist_id exist
    - Implement get_assignments
    - _Requirements: 3.3, 5.2, 10.1, 10.2, 10.5, 10.6_
  - [x] 6.5 Write property test for single active assignment constraint
    - **Property 4: Single Active Assignment Constraint**
    - Test that creating new assignment deactivates previous
    - **Validates: Requirements 5.1, 5.2**

- [x] 7. Implement admin API endpoints
  - [x] 7.1 Extend admin routes (`apps/api/routes/admin.py`)
    - POST /admin/properties - create property
    - GET /admin/properties - list properties
    - PATCH /admin/properties/{property_id} - update property
    - POST /admin/florists - create florist
    - GET /admin/florists - list florists
    - POST /admin/property-assignments - create assignment
    - GET /admin/property-assignments - list assignments
    - All endpoints require ADMIN role
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
  - [x] 7.2 Write property test for admin endpoint authorization
    - **Property 6: Admin Endpoint Authorization**
    - Test 401 for unauthenticated, 403 for non-admin, success for admin
    - **Validates: Requirements 8.3, 8.4, 9.3, 9.4, 10.3, 10.4**
  - [x] 7.3 Write property test for CRUD round-trip consistency
    - **Property 7: CRUD Round-Trip Consistency**
    - Test that created entities can be retrieved with matching fields
    - **Validates: Requirements 8.1, 8.2, 9.1, 9.2, 10.1, 10.2**

- [x] 8. Update exception handler for validation errors
  - [x] 8.1 Extend global exception handler to wrap 422 validation errors
    - Ensure FastAPI validation errors return standard error envelope
    - _Requirements: 12.1, 12.4_
  - [x] 8.2 Write property test for error response format
    - **Property 8: Error Response Format Consistency**
    - Test all error responses contain code, message, request_id
    - **Validates: Requirements 12.1, 12.2, 12.3, 12.4**

- [x] 9. Checkpoint - API implementation complete
  - Ensure all tests pass
  - Verify endpoints work with manual testing
  - Ask the user if questions arise

- [x] 10. Create shared TypeScript types
  - [x] 10.1 Create domain types (`packages/shared/src/types/domain.ts`)
    - PropertyStatus, FloristStatus enums
    - Property, Florist, PropertyAssignment interfaces
    - Request types for create/update operations
    - _Requirements: 11.1, 11.2, 11.3_
  - [x] 10.2 Export types from packages/shared/src/index.ts
    - _Requirements: 11.1_

- [x] 11. Write remaining property tests
  - [x] 11.1 Write property test for entity creation defaults
    - **Property 1: Entity Creation Defaults**
    - Test Property.status=DRAFT, Florist.status=ONBOARDING, Assignment.active=true
    - **Validates: Requirements 1.3, 2.3, 3.3**
  - [x] 11.2 Write property test for timestamp initialization
    - **Property 2: Timestamp Initialization and Update**
    - Test created_at set on creation, updated_at changes on update
    - **Validates: Requirements 1.4, 1.5, 2.4, 3.4**
  - [x] 11.3 Write property test for referential integrity
    - **Property 5: Referential Integrity**
    - Test that invalid property_id/florist_id returns 400 NOT_FOUND
    - **Validates: Requirements 3.2, 10.5, 10.6**

- [x] 12. AWS Infrastructure setup
  - [x] 12.1 Provision RDS PostgreSQL instance (dev environment)
    - Use AWS MCP or document manual steps if needed
    - Configure security group for App Runner access
    - _Requirements: 6.1_
  - [x] 12.2 Configure environment variables for database connection
    - Set DATABASE_URL or component variables
    - Store password in Secrets Manager
    - _Requirements: 6.2, 6.3_
  - [x] 12.3 Run migrations against RDS instance
    - Execute `alembic upgrade head`
    - Verify tables created correctly
    - _Requirements: 7.2, 7.4_

- [x] 13. Final checkpoint - Full integration
  - Ensure all tests pass
  - Verify API is deployed and reachable on AWS
  - Verify database contains the three tables
  - Test admin can create property, florist, and assignment
  - Test property cannot be set ACTIVE without assignment
  - Ask the user if questions arise

- [x] 14. Update documentation
  - [x] 14.1 Update docs/README.md with schema summary
    - Document the three core entities and their relationships
    - _Requirements: N/A (documentation)_
  - [x] 14.2 Update CHANGELOG.md with implementation summary
    - _Requirements: N/A (documentation)_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- PostgreSQL is the only supported database for this feature
