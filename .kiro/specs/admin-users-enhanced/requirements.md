# Requirements Document

## Introduction

This feature implements the Admin Users management UI and supporting API functionality for the Bloom platform. Admins can create, view, and manage users, assign them to properties where appropriate, and control user subscription state. This completes the core admin control surface for Properties, Florists, and Users.

## Glossary

- **Admin_UI**: Web-based interface accessible only to ADMIN users
- **Users_Page**: Admin page for managing user accounts
- **User**: An authenticated account with role-based permissions
- **User_Role**: One of CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN
- **User_Subscription_Status**: Subscription lifecycle state for CUSTOMER users (CREATED, ACTIVE, PAUSED)
- **Property_Assignment**: Association between a PROPERTY_MANAGER user and a Property
- **Error_Envelope**: Standard API error response format `{ error: { code, message } }`

## Requirements

### Requirement 1: User Data Model Enhancements

**User Story:** As a system, I need richer user metadata so that admins can manage users and properties effectively.

#### Acceptance Criteria

1. THE User model SHALL include:
   - id (UUID)
   - email (string, unique)
   - role (enum: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN)
   - subscription_status (enum: CREATED, ACTIVE, PAUSED; nullable for non-CUSTOMER users)
   - property_id (nullable FK to Property)
   - created_at (timestamp)
2. WHEN a CUSTOMER user is created, THE subscription_status SHALL default to CREATED
3. WHEN a non-CUSTOMER user is created, THE subscription_status SHALL be null
4. THE System SHALL enforce referential integrity on property_id

---

### Requirement 2: Admin Users List API

**User Story:** As an admin, I want to view all users, so that I can understand who has access to the system.

#### Acceptance Criteria

1. THE API SHALL provide GET /admin/users
2. THE response SHALL include:
   - id
   - email
   - role
   - property_name (nullable)
   - subscription_status (nullable)
   - created_at
3. THE endpoint SHALL require ADMIN role authentication

---

### Requirement 3: Admin Create User API

**User Story:** As an admin, I want to create users, so that I can onboard residents, property managers, florists, and admins.

#### Acceptance Criteria

1. THE API SHALL provide POST /admin/users
2. THE request SHALL accept:
   - email (required)
   - role (required)
   - password (required, min length enforced)
   - property_id (optional)
3. WHEN role = PROPERTY_MANAGER:
   - property_id MAY be provided
4. WHEN role ≠ PROPERTY_MANAGER:
   - property_id SHALL be rejected if provided
5. WHEN role = CUSTOMER:
   - subscription_status SHALL default to CREATED
6. WHEN email already exists:
   - THE API SHALL return 409 Conflict
7. THE endpoint SHALL require ADMIN role authentication

---

### Requirement 4: Admin Update User API

**User Story:** As an admin, I want to update users, so that I can manage roles, property assignments, and subscriptions.

#### Acceptance Criteria

1. THE API SHALL provide PATCH /admin/users/{id}
2. THE request MAY update:
   - role
   - property_id
   - subscription_status
3. WHEN updating role:
   - Invalid fields SHALL be cleared (e.g. property_id removed if role ≠ PROPERTY_MANAGER)
4. WHEN updating subscription_status:
   - The user MUST have role = CUSTOMER
5. WHEN updating property_id:
   - The user MUST have role = PROPERTY_MANAGER
6. THE endpoint SHALL require ADMIN role authentication

---

### Requirement 5: Admin Users Page UI

**User Story:** As an admin, I want a simple UI to manage users, so that I can do everything without leaving the dashboard.

#### Acceptance Criteria

1. WHEN navigating to /admin/users, THE Users_Page SHALL display a table with columns:
   - Email
   - Role
   - Property
   - Subscription Status
   - Created At
2. THE Users_Page SHALL fetch data from GET /admin/users
3. THE Users_Page SHALL include an "Add User" button
4. Clicking "Add User" SHALL open a modal with fields:
   - Email
   - Role
   - Password
   - Property (conditional)
   - Subscription Status (conditional)
5. Fields SHALL render conditionally:
   - Property selector ONLY when role = PROPERTY_MANAGER
   - Subscription status ONLY when role = CUSTOMER
6. Inline dropdowns SHALL allow updating:
   - role
   - subscription_status (CUSTOMER only)

---

### Requirement 6: Business Rules & Side Effects

**User Story:** As a system, I want changes to users to correctly impact properties.

#### Acceptance Criteria

1. WHEN a PROPERTY_MANAGER is assigned or removed from a property:
   - Property status SHALL recompute automatically
2. WHEN a CUSTOMER subscription_status changes:
   - Admin Properties total_users / active_users counts SHALL update
3. Invalid role/field combinations SHALL never persist

---

### Requirement 7: RBAC Enforcement

**User Story:** As a security measure, I want to restrict user management to admins only.

#### Acceptance Criteria

1. Non-admin users accessing /admin/users SHALL be redirected to unauthorized UI
2. Unauthenticated API requests SHALL return 401 Unauthorized
3. Authenticated non-admin API requests SHALL return 403 Forbidden

---

### Requirement 8: Correctness Properties

*A property is a system invariant that must always hold true.*

1. For any user created via POST /admin/users, the user SHALL appear in GET /admin/users
2. For any CUSTOMER user, subscription_status SHALL always be one of CREATED, ACTIVE, PAUSED
3. For any PROPERTY_MANAGER user, property_id SHALL be valid or null
4. For any invalid role-field combination, the API SHALL reject or sanitize the request
5. Only ADMIN users SHALL ever be able to mutate users

---

### Requirement 9: Error Handling

#### Acceptance Criteria

1. All errors SHALL return the standard Error_Envelope
2. The Admin_UI SHALL display error.message inline near the triggering action
3. Errors SHALL clear on retry
