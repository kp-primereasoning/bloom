# Implementation Plan: Customer Onboarding Flow

## Overview

This plan implements a self-service customer onboarding flow enabling new customers to register, select their property, activate their subscription, and access their dashboard. Implementation follows backend-first approach, then frontend, then integration testing.

## Tasks

- [x] 1. Implement backend registration endpoint
  - [x] 1.1 Add RegisterRequest and RegisterResponse schemas to `apps/api/schemas/domain.py`
    - RegisterRequest: email (EmailStr), password (str, min_length=6)
    - RegisterResponse: access_token, token_type, user (UserResponse)
    - _Requirements: 1.1, 1.3_
  - [x] 1.2 Implement `POST /auth/register` endpoint in `apps/api/routes/auth.py`
    - Check for existing user (409 if exists)
    - Hash password using auth_service
    - Create user with role=CUSTOMER, subscription_status=CREATED, property_id=null
    - Generate JWT and return RegisterResponse
    - _Requirements: 1.1, 1.2, 1.4, 1.6_
  - [x] 1.3 Write property test for registration defaults
    - **Property 1: Registration creates CUSTOMER with correct defaults**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 1.4 Write property test for invalid email rejection
    - **Property 2: Registration rejects invalid email formats**
    - **Validates: Requirements 1.5**

- [x] 2. Implement public properties endpoint
  - [x] 2.1 Create `apps/api/routes/properties.py` with PropertyListItem schema
    - PropertyListItem: id, name, address only
    - _Requirements: 2.2_
  - [x] 2.2 Implement `GET /properties` endpoint (no auth required)
    - Query non-ARCHIVED properties
    - Return minimal PropertyListItem list
    - _Requirements: 2.1, 2.3_
  - [x] 2.3 Register properties router in `apps/api/main.py`
    - _Requirements: 2.1_
  - [x] 2.4 Write property test for properties list format
    - **Property 3: Property list returns correct format excluding archived**
    - **Validates: Requirements 2.2, 2.3**

- [x] 3. Implement /me endpoints for customer self-service
  - [x] 3.1 Create `apps/api/routes/me.py` with MePropertyUpdate and MeSubscriptionUpdate schemas
    - MePropertyUpdate: property_id (UUID)
    - MeSubscriptionUpdate: subscription_status (ACTIVE or PAUSED only)
    - _Requirements: 3.1, 4.1_
  - [x] 3.2 Implement `PATCH /me/property` endpoint
    - Require CUSTOMER role
    - Validate property exists and not ARCHIVED
    - Update user.property_id
    - Return updated UserResponse
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [x] 3.3 Implement `PATCH /me/subscription` endpoint
    - Require CUSTOMER role
    - Validate status is ACTIVE or PAUSED (reject CREATED)
    - Update user.subscription_status
    - Return updated UserResponse
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 3.4 Register me router in `apps/api/main.py`
    - _Requirements: 3.1, 4.1_
  - [x] 3.5 Write property test for RBAC enforcement on /me endpoints
    - **Property 4: Non-CUSTOMER roles get 403 on /me/* endpoints**
    - **Validates: Requirements 3.3, 4.3**
  - [x] 3.6 Write property test for property assignment round-trip
    - **Property 5: Property assignment round-trip**
    - **Validates: Requirements 3.4**
  - [x] 3.7 Write property test for subscription update round-trip
    - **Property 6: Subscription update round-trip**
    - **Validates: Requirements 4.4, 4.6**
  - [x] 3.8 Write property test for CREATED status rejection
    - **Property 7: Subscription endpoint rejects CREATED status**
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Backend API complete
  - Ensure all backend tests pass
  - Verify endpoints work via manual testing or curl
  - Ask the user if questions arise

- [x] 5. Add TypeScript types and API client methods
  - [x] 5.1 Add onboarding types to `packages/shared/src/types/domain.ts`
    - PropertyListItem, RegisterRequest, RegisterResponse
    - MePropertyUpdateRequest, MeSubscriptionUpdateRequest
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  - [x] 5.2 Add API client methods to `apps/web/src/lib/api.ts`
    - register(), listProperties(), updateMyProperty(), updateMySubscription()
    - _Requirements: 13.6_
  - [x] 5.3 Update UserResponse in shared types to include property_id and subscription_status
    - Ensure frontend can access these fields after login/register
    - _Requirements: 10.1, 10.2_

- [x] 6. Implement onboarding frontend components
  - [x] 6.1 Create OnboardingProgress component at `apps/web/src/components/OnboardingProgress.tsx`
    - Display "Step X of 3" with visual indicators
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 6.2 Create OnboardingLayout component at `apps/web/src/components/OnboardingLayout.tsx`
    - Wrapper with progress header for onboarding pages
    - _Requirements: 6.1_

- [x] 7. Implement onboarding pages
  - [x] 7.1 Create RegisterPage at `apps/web/src/pages/onboarding/RegisterPage.tsx`
    - Email and password form
    - Parse ?email= and ?property_id= query params
    - Store property_id in sessionStorage for later
    - Call register API, store token, redirect to /onboarding/property
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.2, 11.3_
  - [x] 7.2 Create PropertyPage at `apps/web/src/pages/onboarding/PropertyPage.tsx`
    - Fetch and display properties list
    - Searchable/filterable list
    - Check sessionStorage for pre-selected property_id
    - Call updateMyProperty API, redirect to /onboarding/subscription
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 11.4_
  - [x] 7.3 Create SubscriptionPage at `apps/web/src/pages/onboarding/SubscriptionPage.tsx`
    - Display property summary
    - "Activate Subscription" button
    - Call updateMySubscription API with ACTIVE, redirect to /customer
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 7.4 Create index.ts barrel export at `apps/web/src/pages/onboarding/index.ts`
    - _Requirements: 5.1_
  - [ ] 7.5 Write property test for property search filter
    - **Property 9: Property search filter returns matching results**
    - **Validates: Requirements 8.2**

- [x] 8. Implement onboarding routing and guards
  - [x] 8.1 Create OnboardingGuard at `apps/web/src/router/OnboardingGuard.tsx`
    - Redirect unauthenticated to /onboarding/register
    - Redirect non-CUSTOMER to role landing page
    - Redirect CUSTOMER based on property_id and subscription_status
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  - [x] 8.2 Add onboarding routes to `apps/web/src/router/index.tsx`
    - /onboarding/register, /onboarding/property, /onboarding/subscription
    - Wrap with OnboardingGuard
    - _Requirements: 5.1_
  - [x] 8.3 Update AuthProvider to include property_id and subscription_status in user state
    - Ensure /auth/me returns these fields
    - _Requirements: 5.4, 5.5_

- [x] 9. Update customer dashboard
  - [x] 9.1 Update CustomerHomePage to display subscription_status and property name
    - Show CTAs for incomplete onboarding
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 10. Checkpoint - Frontend complete
  - Ensure frontend builds without errors
  - Manual test the onboarding flow
  - Ask the user if questions arise

- [x] 11. Write integration tests
  - [x] 11.1 Write backend integration test for full onboarding flow
    - Register → set property → activate subscription → access /customer/ping
    - _Requirements: 1.2, 3.4, 4.6_
  - [x] 11.2 Write unit tests for error cases
    - Duplicate email 409, invalid property 400, CREATED status rejection 400
    - _Requirements: 1.4, 3.5, 3.6, 4.5_
  - [x] 11.3 Write property test for error envelope format
    - **Property 8: Error responses follow Error_Envelope format**
    - **Validates: Requirements 12.1, 12.2**

- [x] 12. Update documentation and changelog
  - [x] 12.1 Update `docs/dev.md` with onboarding flow instructions
    - How to test locally: start stack, open /onboarding/register, complete flow
    - _Requirements: Documentation_
  - [x] 12.2 Add changelog entry for "Customer Onboarding Flow"
    - _Requirements: Changelog_

- [x] 13. Final checkpoint
  - Ensure all tests pass
  - Verify end-to-end flow works
  - Ask the user if questions arise

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
