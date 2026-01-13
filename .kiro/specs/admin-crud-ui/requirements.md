# Requirements Document

## Introduction

This feature implements the Admin CRUD UI for managing the three core entities in the Bloom platform: Properties, Florists, and Users. The UI will be built within the existing admin dashboard shell, providing simple tables with add/edit functionality using existing API endpoints where available.

## Glossary

- **Admin_UI**: The web-based administrative interface accessible only to users with ADMIN role
- **Properties_Page**: Admin page for managing property entities (buildings/locations)
- **Florists_Page**: Admin page for managing florist partner entities
- **Users_Page**: Admin page for managing user accounts and roles
- **Modal**: A dialog overlay for creating or editing entities
- **Status_Dropdown**: A UI control for changing entity status values
- **Error_Envelope**: The standard API error response format `{ error: { code, message } }`

## Requirements

### Requirement 1: Admin Properties Page

**User Story:** As an admin, I want to view and manage properties, so that I can onboard new buildings and update their status.

#### Acceptance Criteria

1. WHEN an admin navigates to /admin/properties, THE Properties_Page SHALL display a table with columns: name, address, status, delivery_cadence, updated_at
2. WHEN the Properties_Page loads, THE Admin_UI SHALL fetch property data from GET /admin/properties
3. WHEN an admin clicks the "Add Property" button, THE Admin_UI SHALL display a Modal with fields: name (required), address (required), delivery_cadence (optional)
4. WHEN an admin submits a valid property form, THE Admin_UI SHALL send a POST request to /admin/properties and add the new property to the table
5. WHEN an admin selects a new status from the Status_Dropdown on a property row, THE Admin_UI SHALL send a PATCH request to /admin/properties/{id} with the new status
6. WHEN a property status update succeeds, THE Properties_Page SHALL immediately reflect the updated status in the table
7. IF an API request fails, THEN THE Admin_UI SHALL display the error message from the Error_Envelope inline near the action that triggered it

### Requirement 2: Admin Florists Page

**User Story:** As an admin, I want to view and manage florists, so that I can onboard new florist partners.

#### Acceptance Criteria

1. WHEN an admin navigates to /admin/florists, THE Florists_Page SHALL display a table with columns: name, status, created_at
2. WHEN the Florists_Page loads, THE Admin_UI SHALL fetch florist data from GET /admin/florists
3. WHEN an admin clicks the "Add Florist" button, THE Admin_UI SHALL display a Modal with field: name (required)
4. WHEN an admin submits a valid florist form, THE Admin_UI SHALL send a POST request to /admin/florists and add the new florist to the table
5. IF an API request fails, THEN THE Admin_UI SHALL display the error message from the Error_Envelope inline near the action that triggered it

### Requirement 3: Admin Users Page

**User Story:** As an admin, I want to view and manage users, so that I can create accounts for residents, property managers, florists, and other admins.

#### Acceptance Criteria

1. WHEN an admin navigates to /admin/users, THE Users_Page SHALL display a table with columns: email, role, created_at
2. WHEN the Users_Page loads, THE Admin_UI SHALL fetch user data from GET /admin/users
3. WHEN an admin clicks the "Add User" button, THE Admin_UI SHALL display a Modal with fields: email (required), role (required dropdown: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN), password (required)
4. WHEN an admin submits a valid user form, THE Admin_UI SHALL send a POST request to /admin/users and add the new user to the table
5. WHEN a new user is created successfully, THE Users_Page SHALL display the user in the table and the user SHALL be able to log in immediately
6. IF an API request fails, THEN THE Admin_UI SHALL display the error message from the Error_Envelope inline near the action that triggered it

### Requirement 4: API Endpoints for User Management

**User Story:** As a backend system, I need to provide user management endpoints, so that the admin UI can create and list users.

#### Acceptance Criteria

1. THE API SHALL provide a GET /admin/users endpoint that returns a list of all users with fields: id, email, role, created_at
2. THE API SHALL provide a POST /admin/users endpoint that accepts: email (required), role (required), password (required)
3. WHEN a POST /admin/users request is received with valid data, THE API SHALL create the user and return the user data (excluding password)
4. WHEN a POST /admin/users request is received with an existing email, THE API SHALL return a 409 Conflict error
5. THE GET /admin/users and POST /admin/users endpoints SHALL require ADMIN role authentication

### Requirement 5: RBAC Enforcement

**User Story:** As a security measure, I want admin pages to be protected, so that only authorized users can access them.

#### Acceptance Criteria

1. WHEN a non-admin user attempts to access /admin/properties, THE Admin_UI SHALL redirect to the unauthorized page
2. WHEN a non-admin user attempts to access /admin/florists, THE Admin_UI SHALL redirect to the unauthorized page
3. WHEN a non-admin user attempts to access /admin/users, THE Admin_UI SHALL redirect to the unauthorized page
4. WHEN an unauthenticated request is made to any /admin/* API endpoint, THE API SHALL return a 401 Unauthorized error
