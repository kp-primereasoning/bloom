# Implementation Plan: Admin CRUD UI

## Overview

This plan implements the Admin CRUD UI for managing Properties, Florists, and Users. Tasks are ordered to build incrementally: backend endpoints first (required for Users page), then reusable frontend components, then page implementations.

**Backend-first for Users:** The Admin Users UI depends on new `/admin/users` endpoints being implemented before the UI.

**Supported statuses:**
- PropertyStatus: DRAFT, SUBMITTED, ACTIVE
- FloristStatus: ONBOARDING, READY

## Non-Goals

- No edit or delete flows (create + list only)
- No pagination, search, or sorting
- No bulk actions
- No assignment management UI in this slice

## Tasks

- [x] 1. Add User Management API Endpoints
  - [x] 1.1 Add UserCreate schema to schemas/domain.py
    - Add UserCreate with email (EmailStr), role (UserRole), password (str, min_length=6)
    - _Requirements: 4.2_
  - [x] 1.2 Add GET /admin/users endpoint to routes/admin.py
    - Return list of all users using get_all_users() from db/users.py
    - Require ADMIN role
    - _Requirements: 4.1, 4.5_
  - [x] 1.3 Add POST /admin/users endpoint to routes/admin.py
    - Check for existing email, return 409 if exists
    - Hash password using auth service
    - Create user and return UserResponse
    - Require ADMIN role
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  - [ ]* 1.4 Write property test for user creation round-trip
    - **Property 3: User Authentication Round-Trip**
    - **Validates: Requirements 3.5, 4.2, 4.3**
  - [ ]* 1.5 Write property test for duplicate email rejection
    - **Property 4: Duplicate Email Rejection**
    - **Validates: Requirements 4.4**

- [x] 2. Checkpoint - Backend API Complete
  - Ensure all API tests pass
  - Verify endpoints work via manual testing or curl
  - Ask the user if questions arise

- [x] 3. Create Reusable Frontend Components
  - [x] 3.1 Create AdminTable component
    - Create apps/web/src/components/AdminTable.tsx
    - Implement generic table with columns, data, loading, and error props
    - Include loading spinner and error display
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 3.2 Create AddModal component
    - Create apps/web/src/components/AddModal.tsx
    - Implement modal with configurable fields (text, email, password, select)
    - Include form validation and error display
    - _Requirements: 1.3, 2.3, 3.3_
  - [x] 3.3 Create StatusDropdown component
    - Create apps/web/src/components/StatusDropdown.tsx
    - Implement inline dropdown for status changes
    - Handle loading state during update
    - Status options: DRAFT, SUBMITTED, ACTIVE for properties
    - _Requirements: 1.5_
  - [x] 3.4 Add frontend types for admin entities
    - Add Property interface with status: 'DRAFT' | 'SUBMITTED' | 'ACTIVE'
    - Add Florist interface with status: 'ONBOARDING' | 'READY'
    - Add User interface to packages/shared/src/types/domain.ts
    - _Requirements: 1.1, 2.1, 3.1_
  - [x] 3.5 Export new components from components/index.ts
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 4. Implement Admin Properties Page
  - [x] 4.1 Replace PropertiesPage placeholder with full implementation
    - Fetch properties on mount using GET /admin/properties
    - Display table with columns: name, address, status, delivery_cadence, updated_at
    - Add "Add Property" button that opens modal
    - Include StatusDropdown in each row (options: DRAFT, SUBMITTED, ACTIVE)
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - [x] 4.2 Implement property creation flow
    - Modal fields: name (required), address (required), delivery_cadence (optional)
    - Submit to POST /admin/properties
    - Add new property to table on success
    - Display error on failure
    - _Requirements: 1.3, 1.4, 1.7_
  - [x] 4.3 Implement property status update flow
    - StatusDropdown triggers PATCH /admin/properties/{id}
    - Update table row on success
    - Display error on failure
    - _Requirements: 1.5, 1.6, 1.7_
  - [ ]* 4.4 Write property test for entity creation round-trip (properties)
    - **Property 1: Entity Creation Round-Trip (Properties)**
    - **Validates: Requirements 1.4**
  - [ ]* 4.5 Write property test for status update persistence
    - **Property 2: Property Status Update Persistence**
    - **Validates: Requirements 1.5, 1.6**

- [x] 5. Implement Admin Florists Page
  - [x] 5.1 Replace FloristsPage placeholder with full implementation
    - Fetch florists on mount using GET /admin/florists
    - Display table with columns: name, status, created_at
    - Add "Add Florist" button that opens modal
    - Status displayed as read-only (ONBOARDING or READY)
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 5.2 Implement florist creation flow
    - Modal fields: name (required)
    - Submit to POST /admin/florists
    - Add new florist to table on success
    - Display error on failure
    - _Requirements: 2.3, 2.4, 2.5_
  - [ ]* 5.3 Write property test for entity creation round-trip (florists)
    - **Property 1: Entity Creation Round-Trip (Florists)**
    - **Validates: Requirements 2.4**

- [x] 6. Implement Admin Users Page
  - [x] 6.1 Create UsersPage with full implementation
    - Fetch users on mount using GET /admin/users
    - Display table with columns: email, role, created_at
    - Add "Add User" button that opens modal
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 6.2 Implement user creation flow
    - Modal fields: email (required), role (required dropdown: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN), password (required)
    - Submit to POST /admin/users
    - Add new user to table on success
    - Display error on failure
    - _Requirements: 3.3, 3.4, 3.6_
  - [x] 6.3 Add UsersPage to admin routes and sidebar
    - Add route /admin/users
    - Add sidebar navigation item
    - _Requirements: 3.1_

- [x] 7. Checkpoint - Frontend Implementation Complete
  - Ensure all frontend tests pass
  - Verify all three pages work end-to-end
  - Ask the user if questions arise

- [x] 8. RBAC and Integration Testing
  - [ ]* 8.1 Write property test for API RBAC enforcement
    - **Property 5: API RBAC Enforcement**
    - **Validates: Requirements 4.5, 5.4**
  - [ ]* 8.2 Write unit tests for frontend route protection
    - Test non-admin users are redirected from /admin/* routes
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 9. Final Checkpoint
  - Ensure all tests pass
  - Verify complete flows: create property, create florist, create user, login as new user
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Existing API endpoints for properties and florists are reused
- Only new endpoints are GET/POST /admin/users
- Frontend uses existing API client and auth patterns
- No PAUSED status - only supported statuses per backend enums
