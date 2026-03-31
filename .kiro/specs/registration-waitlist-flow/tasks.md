# Implementation Plan: Registration & Waitlist Flow

## Overview

Replace the custom email/password registration form with Cognito Hosted UI redirect, add authorization code exchange via the API, provision local users after Cognito auth, implement post-auth routing, and introduce a waitlist system for unlisted buildings. Changes span three codebases: Landing Page (Next.js), Web App (React + Vite), and API (FastAPI).

## Tasks

- [x] 1. Landing Page — Cognito redirect
  - [x] 1.1 Create `apps/landing/lib/cognito.ts` URL helper and update CTA buttons
    - Create `getCognitoSignupUrl()` using `NEXT_PUBLIC_COGNITO_DOMAIN`, `NEXT_PUBLIC_COGNITO_CLIENT_ID`, `NEXT_PUBLIC_COGNITO_REDIRECT_URI`
    - Update `apps/landing/app/page.tsx`: replace all `href={APP_URL}/onboarding/register` with `getCognitoSignupUrl()`
    - Update `apps/landing/components/navigation.tsx`: replace "Register" button href with `getCognitoSignupUrl()`
    - Add env vars to `apps/landing/.env.local`
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 1.2 Write property test for Cognito URL construction (Property 1)
    - **Property 1: Cognito URL contains all required OAuth parameters**
    - Create `apps/landing/__tests__/cognito-url.property.test.ts`
    - Use `fast-check` to generate random domain, client_id, redirect_uri values
    - Assert URL contains `client_id`, `redirect_uri`, `response_type=code`, `scope=openid email profile`, and host matches domain
    - **Validates: Requirements 1.1, 1.3**

- [x] 2. API — Cognito callback endpoint and user provisioning
  - [x] 2.1 Add Pydantic schemas for Cognito callback and waitlist
    - Create `CognitoCallbackRequest`, `WaitlistCreateRequest`, `WaitlistCreateResponse`, `WaitlistEntryResponse`, `WaitlistListResponse` in `apps/api/schemas/domain.py`
    - _Requirements: 2.3, 5.3, 6.1_

  - [x] 2.2 Implement `POST /auth/cognito/callback` endpoint
    - Add endpoint to `apps/api/routes/auth.py`
    - Exchange authorization code with Cognito `/oauth2/token` endpoint via `httpx`
    - Decode ID token to extract `email` and `sub`
    - Find-or-create local user by email (role=CUSTOMER, subscription_status=CREATED)
    - Return `LoginResponse` with access_token and user object (including `property_id`, `subscription_status`)
    - Handle errors: missing code (400), invalid/expired code (401), Cognito unreachable (502), bad ID token (500)
    - _Requirements: 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

  - [ ]* 2.3 Write property test for token exchange request format (Property 2)
    - **Property 2: Token exchange request is well-formed**
    - Create `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate random auth codes and config values
    - Assert request body contains `grant_type=authorization_code`, `code`, `client_id`, `redirect_uri`
    - **Validates: Requirements 2.3**

  - [ ]* 2.4 Write property test for ID token claim extraction (Property 3)
    - **Property 3: ID token claim extraction round trip**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate random email/sub pairs, encode as JWTs, decode and verify round trip
    - **Validates: Requirements 2.4**

  - [ ]* 2.5 Write property test for user find-or-create idempotence (Property 4)
    - **Property 4: User find-or-create is idempotent**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate random emails and UUIDs, call provisioning twice, assert single user record with correct fields
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Checkpoint — Cognito callback and user provisioning
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. API — Waitlist schema, model, and migration
  - [x] 4.1 Create WaitlistEntry SQLAlchemy model
    - Create `apps/api/models/waitlist.py` with `WaitlistEntry` ORM model and `WaitlistStatus` enum
    - Columns: `id`, `user_id` (FK → users.id), `building_name`, `building_address`, `status` (default PENDING), `created_at`
    - _Requirements: 6.1, 6.3, 6.4_

  - [x] 4.2 Create Alembic migration 013 for `waitlist_entries` table
    - Create migration file `apps/api/alembic/versions/YYYYMMDD_0001_013_create_waitlist_entries_table.py`
    - Include indexes on `user_id` and `created_at DESC`
    - _Requirements: 6.1, 6.2_

  - [x] 4.3 Implement `POST /auth/waitlist` endpoint
    - Add endpoint to `apps/api/routes/auth.py` (or new `routes/waitlist.py`)
    - Requires authentication (any authenticated user)
    - Validates `building_name` (1–255 chars) and `building_address` (1–500 chars) via Pydantic
    - Creates `waitlist_entries` row with status=PENDING
    - Returns 201 with `{id, message}`
    - Allows multiple entries per user
    - _Requirements: 5.3, 5.4, 5.5, 5.7, 6.4_

  - [x] 4.4 Implement `GET /admin/waitlist` endpoint
    - Add endpoint to `apps/api/routes/admin.py` (or new route file)
    - Requires ADMIN role
    - Returns paginated list ordered by `created_at` DESC
    - Includes `user_email`, `building_name`, `building_address`, `status`, `created_at`
    - Query params: `page` (default 1), `per_page` (default 20)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 4.5 Write property test for waitlist input validation (Property 6)
    - **Property 6: Waitlist input validation respects length bounds**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate strings of varying lengths (0–600 chars)
    - Assert valid lengths accepted, invalid lengths rejected
    - **Validates: Requirements 5.3**

  - [ ]* 4.6 Write property test for waitlist creation round trip (Property 7)
    - **Property 7: Waitlist creation round trip**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate valid building names and addresses
    - Assert created entry matches input with status=PENDING and non-null created_at
    - **Validates: Requirements 5.4, 5.5, 6.4**

  - [ ]* 4.7 Write property test for multiple waitlist entries (Property 8)
    - **Property 8: Users can have multiple waitlist entries**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate random number of prior entries (0–5), submit new entry, assert count = N+1
    - **Validates: Requirements 5.7**

  - [ ]* 4.8 Write property test for admin waitlist ordering (Property 9)
    - **Property 9: Admin waitlist list is ordered and complete**
    - Add to `apps/api/tests/properties/test_registration_waitlist.py`
    - Use `hypothesis` to generate sets of entries with varying timestamps
    - Assert response ordered by `created_at` DESC and includes all required fields
    - **Validates: Requirements 7.1, 7.2**

- [x] 5. Checkpoint — Waitlist API and database
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Web App — Callback page and auth flow
  - [x] 6.1 Add `exchangeAuthCode` API client function
    - Add `exchangeAuthCode(code: string)` to `apps/web/src/lib/api.ts`
    - POSTs to `/auth/cognito/callback` with `{code}`
    - Returns `LoginResponse` (access_token + user)
    - _Requirements: 2.1, 2.2_

  - [x] 6.2 Create `/auth/callback` page component
    - Create `apps/web/src/pages/CallbackPage.tsx`
    - Extract `code` from URL query params
    - Call `exchangeAuthCode(code)`, store token via `setAuthToken()`, set user via `setUser()`
    - Route based on user state: no property → `/onboarding/property`, CREATED → `/onboarding/subscription`, ACTIVE/PAUSED → `/customer`
    - Show loading spinner during exchange, error message with retry link on failure
    - _Requirements: 2.1, 2.2, 3.4, 4.1, 4.2, 4.3_

  - [x] 6.3 Replace RegisterPage with Cognito redirect
    - Update `apps/web/src/pages/onboarding/RegisterPage.tsx` to redirect to Cognito signup URL instead of showing the custom form
    - Use env vars `VITE_COGNITO_DOMAIN`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_REDIRECT_URI`
    - _Requirements: 8.1_

  - [x] 6.4 Update router configuration
    - Add `/auth/callback` route to `apps/web/src/router/index.tsx` pointing to `CallbackPage`
    - Update `/onboarding/register` route to use the new redirect-based RegisterPage
    - _Requirements: 8.2, 8.3_

  - [ ]* 6.5 Write property test for post-auth routing logic (Property 5)
    - **Property 5: Post-authentication routing is deterministic**
    - Create `apps/web/src/__tests__/registration-waitlist-properties.test.ts`
    - Use `fast-check` to generate random user objects with varying `property_id` and `subscription_status`
    - Assert: null property_id → `/onboarding/property`, set property_id + CREATED → `/onboarding/subscription`, ACTIVE/PAUSED → `/customer`
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 7. Web App — Waitlist form
  - [x] 7.1 Add `submitWaitlistEntry` API client function
    - Add `submitWaitlistEntry(data)` to `apps/web/src/lib/api.ts`
    - POSTs to `/auth/waitlist` with `{building_name, building_address}`
    - Returns `{id, message}`
    - _Requirements: 5.3_

  - [x] 7.2 Add waitlist form to PropertyPage
    - Update `apps/web/src/pages/onboarding/PropertyPage.tsx`
    - Add "My building isn't listed" link below property list
    - Show inline form with building_name (1–255 chars) and building_address (1–500 chars) fields
    - On submit, call `submitWaitlistEntry`
    - On success, show confirmation: "We'll notify you when your building goes live"
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 8. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The API uses Python (FastAPI, SQLAlchemy, Hypothesis) and the frontend uses TypeScript (React, fast-check)
