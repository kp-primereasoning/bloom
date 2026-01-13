# Implementation Plan: Customer Dashboard v1

## Overview

This plan implements Customer Dashboard v1 with enriched user data, contextual action buttons, and pause/resume subscription functionality. Tasks are ordered to build incrementally: shared types first, then backend API, then frontend UI.

## Tasks

- [x] 1. Update shared types for dashboard
  - [x] 1.1 Add MeResponse type with property_name field to packages/shared/src/types/domain.ts
    - Include id, email, role, property_id, property_name (nullable), subscription_status, created_at
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Enhance backend /auth/me endpoint
  - [x] 2.1 Update GET /auth/me to return property_name
    - Modify apps/api/routes/auth.py get_me function
    - When user has property_id, query Property table for name
    - When user has no property_id, return property_name as null
    - Update response schema to include property_name
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 2.2 Write property test for property_name resolution
    - **Property 1: Me Endpoint Property Name Resolution**
    - Generate users with/without property_id, verify property_name matches
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 3. Verify subscription endpoint validation
  - [x] 3.1 Confirm PATCH /me/subscription rejects CREATED status
    - Review existing implementation in apps/api/routes/me.py
    - Verify 400 response for CREATED status
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Write property test for subscription status validation
    - **Property 2: Subscription Status Validation**
    - Generate random status values, verify only ACTIVE/PAUSED accepted
    - **Validates: Requirements 4.1, 4.2**
  - [x] 3.3 Write property test for customer role enforcement
    - **Property 3: Customer Role Enforcement**
    - Generate users with different roles, verify CUSTOMER-only access
    - **Validates: Requirements 4.3**

- [x] 4. Update frontend API client
  - [x] 4.1 Add getMe() method to apps/web/src/lib/api.ts
    - Return Promise<MeResponse> from GET /auth/me
    - _Requirements: 5.4_
  - [x] 4.2 Verify updateMySubscription() method exists and returns MeResponse
    - Already exists, confirm return type matches MeResponse
    - _Requirements: 5.5_

- [x] 5. Implement customer dashboard UI
  - [x] 5.1 Update HomePage.tsx to use getMe() for enriched data
    - Replace current property lookup with property_name from API
    - Add loading state while fetching
    - Add error state for API failures
    - _Requirements: 2.1, 2.2, 2.4, 2.5_
  - [x] 5.2 Add "Next delivery" placeholder section
    - Display static "Coming soon" text
    - _Requirements: 2.3_
  - [x] 5.3 Implement contextual action buttons
    - "Select your building" when property_id is null → link to /onboarding/property
    - "Activate subscription" when status is CREATED → link to /onboarding/subscription
    - "Pause subscription" when status is ACTIVE → calls updateMySubscription with PAUSED
    - "Resume subscription" when status is PAUSED → calls updateMySubscription with ACTIVE
    - Show loading state on button during API call
    - Display error message near action area on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 5.4 Write unit tests for dashboard action button states
    - Test each button renders for correct user state
    - Test button click triggers correct action
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 6. Verify route protection
  - [x] 6.1 Confirm /customer route redirects non-customers
    - Review existing router configuration
    - Verify ADMIN, PROPERTY_MANAGER, FLORIST redirect to their landing pages
    - Verify unauthenticated users redirect to /login
    - _Requirements: 6.1, 6.2_

- [x] 7. Checkpoint - Ensure all tests pass
  - Run backend tests: `cd apps/api && pytest tests/`
  - Run frontend tests: `cd apps/web && pnpm test`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update changelog
  - [x] 8.1 Add entry for Customer Dashboard v1 to CHANGELOG.md
    - Date, feature name, description of functionality

## Notes

- All tasks including tests are required for comprehensive coverage
- The existing PATCH /me/subscription endpoint already handles validation; task 3.1 is verification only
- Property tests use Hypothesis library (already configured in apps/api)
- Frontend tests use Vitest (already configured in apps/web)
