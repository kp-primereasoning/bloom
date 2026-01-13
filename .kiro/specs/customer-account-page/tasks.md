# Implementation Plan: Customer Account Page

## Overview

Implement the Customer Account page following the established patterns from other customer pages. No API changes required - uses existing `GET /auth/me` endpoint.

## Tasks

- [x] 1. Create AccountPage component
  - [x] 1.1 Create `apps/web/src/pages/customer/AccountPage.tsx`
    - Implement page with loading, error, and data states
    - Fetch user data via `getMe()` on mount
    - Create Card wrapper component (or reuse from HelpPage pattern)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 1.2 Implement Profile Card
    - Display page title "Account"
    - 2-column table with Email and Member since rows
    - Format `created_at` date for display
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.3 Implement Building Card
    - Display property_name or "Not selected"
    - Show "Select your building" CTA button when property_id is null
    - Show "Change building" link when property_id is set
    - Both navigate to `/onboarding/property`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.4 Implement Billing Card placeholder
    - Display coming soon message
    - Add disabled "Update payment method" button
    - Add disabled "View invoices" button
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.5 Implement Support Card
    - Add FAQ link to `/customer/help`
    - Add email link to `mailto:support@bloom.com?subject=Bloom%20Support`
    - _Requirements: 6.1, 6.2_

- [x] 2. Add route configuration
  - [x] 2.1 Add `/customer/account` route to router
    - Import AccountPage component
    - Add route under customer namespace with ProtectedRoute wrapper
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 2.2 Export AccountPage from customer pages index (if exists)
    - _Requirements: 1.1_

- [x] 3. Checkpoint - Verify page renders correctly
  - Ensure page loads at `/customer/account`
  - Verify all 4 cards display correctly
  - Test building CTA navigation
  - Ask the user if questions arise.

- [x] 4. Write unit tests
  - [x] 4.1 Create `apps/web/src/__tests__/account-page.test.tsx`
    - Test loading skeleton display
    - Test error state with retry button
    - Test profile card content (email, date)
    - Test building card with property (shows name, change link)
    - Test building card without property (shows "Not selected", CTA button)
    - Test billing placeholder text and disabled buttons
    - Test support links (FAQ href, email href)
    - Test no subscription UI elements present
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 5. Write property-based tests
  - [x] 5.1 Write property test for non-CUSTOMER role redirect
    - **Property 1: Non-CUSTOMER role redirect**
    - Generate non-CUSTOMER roles, verify redirect to role's default path
    - **Validates: Requirements 1.4**

  - [x] 5.2 Write property test for profile data display
    - **Property 2: Profile data display**
    - Generate random emails and dates, verify they appear in rendered output
    - **Validates: Requirements 3.2, 3.3**

  - [x] 5.3 Write property test for building display
    - **Property 3: Building display based on property state**
    - Generate MeResponse with/without property_id, verify correct display
    - **Validates: Requirements 4.1, 4.2**

  - [x] 5.4 Write property test for no subscription UI
    - **Property 4: No subscription UI elements**
    - Render with various MeResponse states, verify no subscription elements
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 6. Final checkpoint - Ensure all tests pass
  - Run `pnpm test` in apps/web
  - Verify no regressions in existing tests
  - Ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- The sidebar already includes the Account link (verified in sidebarConfig.ts)
- No API or shared type changes required - MeResponse already has property_name
- Property tests use Vitest with fast-check library
