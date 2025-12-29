# Requirements Document

## Introduction

This document defines the requirements for implementing the core data model and AWS-backed persistence for the Bloom platform. The system will introduce the foundational domain entities (Property, Florist, PropertyAssignment) backed by a real AWS RDS database, with proper migrations and admin-only API endpoints. This establishes the data foundation for all future Bloom features.

## Glossary

- **Property**: A physical location (building/complex) that participates in Bloom's floral subscription program
- **Florist**: A flower vendor connected to the Bloom platform who fulfills deliveries
- **PropertyAssignment**: A relationship linking a Florist to a Property for fulfillment
- **Property_Status**: Lifecycle state of a property: DRAFT (initial), SUBMITTED (pending review), ACTIVE (live)
- **Florist_Status**: Lifecycle state of a florist: ONBOARDING (setup in progress), READY (can accept assignments)
- **Migration_System**: The database migration tool (Alembic) managing schema changes
- **ORM**: Object-Relational Mapping layer (SQLAlchemy) for database interactions
- **Admin_API**: Protected API endpoints accessible only to users with ADMIN role
- **Error_Response**: Standardized JSON error format with code, message, and request_id fields

## Requirements

### Requirement 1: Property Entity

**User Story:** As a Bloom admin, I want to create and manage properties, so that I can onboard new buildings into the floral subscription program.

#### Acceptance Criteria

1. THE Property model SHALL include id (UUID, primary key), name (string), address (string), status (enum), delivery_cadence (string, nullable), created_at (timestamp), and updated_at (timestamp)
2. THE Property_Status enum SHALL include values: DRAFT, SUBMITTED, ACTIVE
3. WHEN a property is created, THE System SHALL set status to DRAFT (properties may only be created in DRAFT status)
4. WHEN a property is created, THE System SHALL set created_at and updated_at to the current timestamp
5. WHEN a property is updated (including status changes and delivery_cadence changes), THE System SHALL automatically update the updated_at timestamp via ORM hooks or database triggers

### Requirement 2: Florist Entity

**User Story:** As a Bloom admin, I want to create and manage florists, so that I can onboard vendors who will fulfill deliveries.

#### Acceptance Criteria

1. THE Florist model SHALL include id (UUID, primary key), name (string), status (enum), and created_at (timestamp)
2. THE Florist_Status enum SHALL include values: ONBOARDING, READY
3. WHEN a florist is created, THE System SHALL set status to ONBOARDING by default
4. WHEN a florist is created, THE System SHALL set created_at to the current timestamp

### Requirement 3: PropertyAssignment Entity

**User Story:** As a Bloom admin, I want to assign florists to properties, so that I can control which vendor fulfills deliveries for each building.

#### Acceptance Criteria

1. THE PropertyAssignment model SHALL include id (UUID, primary key), property_id (foreign key), florist_id (foreign key), active (boolean), and created_at (timestamp)
2. THE PropertyAssignment SHALL enforce referential integrity with Property and Florist tables at the database level
3. WHEN an assignment is created, THE System SHALL set active to true by default
4. WHEN an assignment is created, THE System SHALL set created_at to the current timestamp

### Requirement 4: Property Status Transitions

**User Story:** As a Bloom admin, I want the system to enforce valid status transitions, so that properties follow the correct lifecycle.

#### Acceptance Criteria

1. THE System SHALL allow status transition from DRAFT to SUBMITTED without requiring an active assignment
2. THE System SHALL allow status transition from SUBMITTED to ACTIVE only when the property has at least one active assignment
3. THE System SHALL NOT allow direct status transition from DRAFT to ACTIVE
4. IF an admin attempts to transition a property to ACTIVE without an active assignment, THEN THE System SHALL reject the request with a 400 Bad Request error
5. IF an admin attempts an invalid status transition (e.g., DRAFT to ACTIVE), THEN THE System SHALL reject the request with a 400 Bad Request error

### Requirement 5: Assignment Constraints

**User Story:** As a Bloom admin, I want the system to enforce assignment rules, so that each property has exactly one active florist at any time.

#### Acceptance Criteria

1. THE System SHALL enforce at most one active PropertyAssignment per property_id at the database level using a partial unique index
2. WHEN a new assignment is created for a property that already has an active assignment, THE System SHALL deactivate the existing assignment before creating the new one
3. THE database constraint SHALL ensure that no two rows can have the same property_id with active=true

### Requirement 6: Database Infrastructure

**User Story:** As a developer, I want the API to connect to a real AWS-managed database, so that data persists reliably across deployments.

#### Acceptance Criteria

1. THE System SHALL connect to an AWS RDS PostgreSQL database provisioned in the dev environment
2. THE System SHALL read database connection parameters from environment variables (DATABASE_URL or component variables such as DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
3. THE System SHALL NOT hardcode database credentials; all secrets must be environment-driven
4. THE System SHALL use SQLAlchemy as the ORM for database interactions
5. WHEN the database connection fails, THE System SHALL return a 503 Service Unavailable error

### Requirement 7: Database Migrations

**User Story:** As a developer, I want a proper migration system, so that I can evolve the database schema safely over time.

#### Acceptance Criteria

1. THE System SHALL use Alembic for database migrations
2. THE Migration_System SHALL support running all migrations against an empty database
3. THE Migration_System SHALL support rolling back migrations
4. THE Migration_System SHALL create the properties, florists, and property_assignments tables with proper constraints
5. THE Migration_System SHALL enforce foreign key constraints at the database level
6. THE Migration_System SHALL create a partial unique index on property_assignments ensuring at most one active=true per property_id

### Requirement 8: Admin Property Endpoints

**User Story:** As a Bloom admin, I want API endpoints to manage properties, so that I can create and view properties through the API.

#### Acceptance Criteria

1. WHEN an admin sends POST /admin/properties with valid data, THE Admin_API SHALL create a new property and return it with 201 Created
2. WHEN an admin sends GET /admin/properties, THE Admin_API SHALL return a list of all properties
3. WHEN a non-admin user accesses /admin/properties, THE Admin_API SHALL return 403 Forbidden
4. WHEN an unauthenticated user accesses /admin/properties, THE Admin_API SHALL return 401 Unauthorized
5. WHEN property creation fails validation, THE Admin_API SHALL return 400 Bad Request with an Error_Response

### Requirement 9: Admin Florist Endpoints

**User Story:** As a Bloom admin, I want API endpoints to manage florists, so that I can create and view florists through the API.

#### Acceptance Criteria

1. WHEN an admin sends POST /admin/florists with valid data, THE Admin_API SHALL create a new florist and return it with 201 Created
2. WHEN an admin sends GET /admin/florists, THE Admin_API SHALL return a list of all florists
3. WHEN a non-admin user accesses /admin/florists, THE Admin_API SHALL return 403 Forbidden
4. WHEN an unauthenticated user accesses /admin/florists, THE Admin_API SHALL return 401 Unauthorized
5. WHEN florist creation fails validation, THE Admin_API SHALL return 400 Bad Request with an Error_Response

### Requirement 10: Admin Assignment Endpoints

**User Story:** As a Bloom admin, I want API endpoints to manage property assignments, so that I can assign florists to properties through the API.

#### Acceptance Criteria

1. WHEN an admin sends POST /admin/property-assignments with valid property_id and florist_id, THE Admin_API SHALL create a new assignment and return it with 201 Created
2. WHEN an admin creates an assignment for a property with an existing active assignment, THE Admin_API SHALL deactivate the previous assignment
3. WHEN a non-admin user accesses /admin/property-assignments, THE Admin_API SHALL return 403 Forbidden
4. WHEN an unauthenticated user accesses /admin/property-assignments, THE Admin_API SHALL return 401 Unauthorized
5. WHEN the referenced property_id does not exist, THE Admin_API SHALL return 400 Bad Request with an Error_Response
6. WHEN the referenced florist_id does not exist, THE Admin_API SHALL return 400 Bad Request with an Error_Response

### Requirement 11: Shared TypeScript Types

**User Story:** As a frontend developer, I want TypeScript types for API responses, so that I can work with domain entities in a type-safe manner.

#### Acceptance Criteria

1. THE System SHALL provide TypeScript types for Property, Florist, and PropertyAssignment entities
2. THE TypeScript types SHALL match the API response structure
3. THE TypeScript types SHALL include proper enum types for Property_Status and Florist_Status

### Requirement 12: Error Handling

**User Story:** As a developer, I want consistent error responses, so that I can handle failures predictably.

#### Acceptance Criteria

1. WHEN a validation error occurs, THE Admin_API SHALL return an Error_Response with code "VALIDATION_ERROR"
2. WHEN a business rule violation occurs (e.g., activating property without assignment), THE Admin_API SHALL return an Error_Response with code "BUSINESS_RULE_VIOLATION"
3. WHEN a referenced entity is not found, THE Admin_API SHALL return an Error_Response with code "NOT_FOUND"
4. THE Error_Response SHALL follow the format: { "error": { "code": "<ERROR_CODE>", "message": "<human readable message>", "request_id": "<uuid>" } }
