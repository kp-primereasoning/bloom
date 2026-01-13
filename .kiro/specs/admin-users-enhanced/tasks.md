# Implementation Plan: Admin Users Enhanced

## Overview

This plan implements the enhanced Admin Users management feature. Tasks are ordered to build incrementally: backend schema/validation first, then API endpoints, then frontend enhancements.

The implementation uses Python (FastAPI) for backend and TypeScript (React) for frontend, matching the existing codebase.

## Tasks

- [x] 1. Enhance Backend User Schemas and Validation
  - [x] 1.1 Add UserCreateEnhanced schema to schemas/domain.py
    - Add property_id (Optional[UUID]) field
    - Add validation: property_id only valid when role = PROPERTY_MANAGER
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 1.2 Add UserUpdate schema to schemas/domain.py
    - Add role (Optional[UserRole])
    - Add property_id (Optional[UUID])
    - Add subscription_status (Optional[SubscriptionStatus])
    - _Requirements: 4.2_
  - [x] 1.3 Add EnrichedUserResponse schema to schemas/domain.py
    - Include property_name (Optional[str]) resolved from property_id
    - Make subscription_status nullable (None for non-CUSTOMER)
    - _Requirements: 2.2_
  - [x] 1.4 Update db/users.py with update_user function
    - Add async update_user(user_id, updates) function
    - _Requirements: 4.1_

- [x] 2. Enhance Backend API Endpoints
  - [x] 2.1 Update POST /admin/users endpoint
    - Accept property_id in request
    - Validate property_id only for PROPERTY_MANAGER role
    - Validate property_id references valid Property if provided
    - Set subscription_status = CREATED for CUSTOMER, None for others
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 1.2, 1.3_
  - [x] 2.2 Update GET /admin/users endpoint
    - Return EnrichedUserResponse with property_name resolved
    - Return subscription_status as null for non-CUSTOMER users
    - _Requirements: 2.1, 2.2_
  - [x] 2.3 Add PATCH /admin/users/{id} endpoint
    - Validate subscription_status update only for CUSTOMER role
    - Validate property_id update only for PROPERTY_MANAGER role
    - Sanitize fields on role change (clear property_id if not PM, clear/set subscription_status)
    - Trigger property status recomputation on PM assignment changes
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 6.1_
  - [x] 2.4 Write property test for user creation round-trip
    - **Property 1: User Creation Round-Trip**
    - **Validates: Requirements 8.1, 3.1, 3.2**
  - [x] 2.5 Write property test for CUSTOMER subscription status default
    - **Property 2: CUSTOMER Subscription Status Default**
    - **Validates: Requirements 1.2, 3.5**
  - [x] 2.6 Write property test for non-CUSTOMER subscription status null
    - **Property 3: Non-CUSTOMER Subscription Status Null**
    - **Validates: Requirements 1.3**
  - [x] 2.7 Write property test for property ID role validation
    - **Property 4: Property ID Role Validation**
    - **Validates: Requirements 1.4, 3.3, 3.4, 4.5**
  - [x] 2.8 Write property test for duplicate email rejection
    - **Property 7: Duplicate Email Rejection**
    - **Validates: Requirements 3.6**

- [x] 3. Checkpoint - Backend API Complete
  - Ensure all API tests pass
  - Verify endpoints work via manual testing
  - Ask the user if questions arise

- [x] 4. Update Shared TypeScript Types
  - [x] 4.1 Update AdminUser interface in packages/shared/src/types/domain.ts
    - Add property_id: string | null
    - Add property_name: string | null
    - Update subscription_status to be nullable
    - _Requirements: 2.2, 5.1_
  - [x] 4.2 Update CreateUserRequest interface
    - Add optional property_id field
    - _Requirements: 3.2_
  - [x] 4.3 Add UpdateUserRequest interface
    - Add role, property_id, subscription_status (all optional)
    - _Requirements: 4.2_

- [x] 5. Enhance Frontend UsersPage
  - [x] 5.1 Update UsersPage table columns
    - Add Property column (shows property_name)
    - Add Subscription Status column (shows subscription_status or '-' for null)
    - _Requirements: 5.1_
  - [x] 5.2 Add inline role dropdown to table rows
    - Allow changing user role via dropdown
    - Call PATCH /admin/users/{id} on change
    - Refresh row data after update
    - _Requirements: 5.6_
  - [x] 5.3 Add inline subscription status dropdown to table rows
    - Only show for CUSTOMER users
    - Allow changing subscription_status via dropdown
    - Call PATCH /admin/users/{id} on change
    - _Requirements: 5.6_

- [x] 6. Enhance AddModal for Users
  - [x] 6.1 Add conditional Property selector to AddModal
    - Show property dropdown only when role = PROPERTY_MANAGER
    - Fetch properties from GET /admin/properties
    - Include property_id in create request
    - _Requirements: 5.4, 5.5_
  - [x] 6.2 Show subscription status info for CUSTOMER role
    - Display read-only "Subscription Status: CREATED" when role = CUSTOMER
    - _Requirements: 5.5_

- [x] 7. Checkpoint - Frontend Implementation Complete
  - Ensure all frontend tests pass
  - Verify UsersPage works end-to-end
  - Ask the user if questions arise

- [x] 8. Property Status Recomputation Tests
  - [x] 8.1 Write property test for PM assignment status recomputation
    - **Property 9: Property Status Recomputation on PM Assignment**
    - **Validates: Requirements 6.1**
  - [x] 8.2 Write property test for role change field sanitization
    - **Property 5: Role Change Field Sanitization**
    - **Validates: Requirements 4.3, 6.3**

- [x] 9. RBAC and Error Handling Tests
  - [x] 9.1 Write property test for RBAC enforcement
    - **Property 8: RBAC Enforcement**
    - **Validates: Requirements 2.3, 3.7, 4.6, 7.2, 7.3, 8.5**
  - [x] 9.2 Write property test for error envelope format
    - **Property 10: Error Envelope Format**
    - **Validates: Requirements 9.1**

- [x] 10. Final Checkpoint
  - Ensure all tests pass
  - Verify complete flows: create user with property, update role, update subscription
  - Ask the user if questions arise

## Notes

- All tasks including property-based tests are required
- Existing User model already has property_id and subscription_status fields
- Property status recomputation uses existing compute_property_status function
- Frontend uses existing API client and auth patterns
