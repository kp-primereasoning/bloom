# Implementation Plan: Customer Subscriptions Page

## Overview

This implementation plan builds the Customer Subscriptions Page feature incrementally, starting with static configuration and utilities, then building the UI components, and finally wiring everything together with API integration.

## Tasks

- [x] 1. Create plan configuration and status utilities
  - [x] 1.1 Create static plan configuration
    - Create `apps/web/src/config/planConfig.ts`
    - Define `PlanConfig` interface with id, name, cadence, cadenceLabel, features
    - Define `SUBSCRIPTION_PLANS` array with Starter, Standard, Premium plans
    - Export helper functions: `getPlanById()`, `getAllPlans()`
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Create status display mapper utility
    - Create `apps/web/src/utils/subscriptionStatus.ts`
    - Define `StatusDisplay` interface
    - Implement `getStatusDisplay()` function mapping CREATED→friendly copy, ACTIVE→"Active", PAUSED→"Paused"
    - Implement `getActionButton()` function for contextual button logic
    - Ensure "CREATED" string never appears in any return value
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 1.3 Write property test for CREATED status never displayed
    - **Property 2: CREATED Status Never Displayed**
    - **Validates: Requirements 2.1**

- [x] 2. Implement PlanCard component
  - [x] 2.1 Create PlanCard component
    - Create `apps/web/src/components/PlanCard.tsx`
    - Accept props: plan, isCurrentPlan, subscriptionStatus, onAction, isLoading
    - Render plan name, cadence label, and features list
    - Apply highlight styling when isCurrentPlan is true
    - Render contextual action button using `getActionButton()`
    - Disable button and show loading state when isLoading is true
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.5, 7.1, 7.2_

  - [x] 2.2 Write property test for plan card content
    - **Property 4: Plan Cards Contain Required Information**
    - **Validates: Requirements 3.2, 3.3, 3.4, 4.2**

  - [x] 2.3 Write property test for action buttons
    - **Property 5: Correct Action Buttons Based on Status**
    - **Validates: Requirements 5.1, 7.1, 7.2**

- [x] 3. Implement SubscriptionPage component
  - [x] 3.1 Create SubscriptionPage component structure
    - Replace placeholder in `apps/web/src/pages/customer/SubscriptionPage.tsx`
    - Add state: userData, isLoading, isActionLoading, error, selectedPlanId
    - Implement useEffect to fetch user data via `getMe()` on mount
    - Render loading skeleton while fetching
    - Render error message if fetch fails
    - _Requirements: 8.1, 8.2_

  - [x] 3.2 Implement page header with status display
    - Render page title "Subscription"
    - Use `getStatusDisplay()` to get subheader text
    - Conditionally render status pill for ACTIVE/PAUSED (not for CREATED)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.3 Implement plan cards grid
    - Render responsive grid of PlanCard components
    - Pass current plan detection based on selectedPlanId or localStorage
    - Pass subscription status and loading state to each card
    - _Requirements: 3.1, 3.6_

  - [x] 3.4 Implement subscription actions
    - Implement `handleActivate()` - calls API, redirects to /customer/home on success
    - Implement `handlePause()` - calls API, updates UI on success
    - Implement `handleResume()` - calls API, updates UI on success
    - Implement `handleSwitch()` - stores plan selection (localStorage for v1)
    - Display inline error messages on failure
    - Refresh auth context after successful status change
    - _Requirements: 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.3, 7.4, 7.5_

  - [x] 3.5 Write property test for API request handling
    - **Property 6: API Request Handling**
    - **Validates: Requirements 8.3, 8.4**

- [x] 4. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire up routing and navigation
  - [x] 5.1 Verify route configuration
    - Confirm `/customer/subscription` route exists in router
    - Verify ProtectedRoute wraps with CUSTOMER role
    - Test redirect behavior for unauthenticated users
    - Test redirect behavior for non-CUSTOMER roles
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 5.2 Verify sidebar navigation
    - Confirm "My Subscription" nav item exists in sidebarConfig
    - Verify path is `/customer/subscription`
    - _Requirements: 1.4_

  - [x] 5.3 Write property test for role redirect
    - **Property 1: Non-Customer Role Redirect**
    - **Validates: Requirements 1.2**

- [x] 6. Update exports and integrate
  - [x] 6.1 Update component exports
    - Add PlanCard to `apps/web/src/components/index.ts`
    - Verify SubscriptionPage export in `apps/web/src/pages/customer/index.ts`
    - _Requirements: 1.3, 1.4_

  - [x] 6.2 Add localStorage helpers for plan selection
    - Create or update `apps/web/src/utils/localStorage.ts`
    - Implement `getSelectedPlan()` and `setSelectedPlan()` functions
    - Add TODO comment for backend persistence
    - _Requirements: 7.5_

- [x] 7. Final checkpoint - End-to-end verification
  - Ensure all tests pass, ask the user if questions arise.
  - Verify page works in both dev and production builds
  - Test with different subscription statuses (CREATED, ACTIVE, PAUSED)
  - Verify no "CREATED" text appears anywhere in UI

- [x] 8. Update documentation
  - [x] 8.1 Update CHANGELOG.md
    - Add entry for Customer Subscriptions Page feature
    - Document plan card UI and status mapping
    - _Requirements: N/A (documentation)_

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout
- Property-based testing uses Vitest with fast-check library
