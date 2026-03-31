# Requirements Document

## Introduction

This feature replaces the custom email/password registration form with Cognito Hosted UI (which already supports Google sign-in and email/password). After Cognito authenticates the user and redirects back to the app with a token, the app exchanges the authorization code for tokens, creates or retrieves the local user record, and routes the user through onboarding. The onboarding flow checks whether the user has a property assigned. If not, the user selects their building from the list of active properties. If their building is not listed, a new waitlist flow captures the building name and address, stores a waitlist entry in the database, and shows a confirmation message. This gives Bloom demand signal for which buildings to activate next.

## Glossary

- **Cognito_Hosted_UI**: The AWS Cognito-managed sign-up/sign-in page that handles email/password and Google OAuth authentication
- **Authorization_Code**: A short-lived code returned by Cognito in the redirect URL, exchanged for access and ID tokens
- **Landing_Page**: The Next.js marketing site at `apps/landing` that contains the Register and CTA buttons
- **Web_App**: The React + Vite application at `apps/web` that hosts the onboarding flow and customer dashboard
- **API**: The FastAPI backend at `apps/api` that manages users, properties, and waitlist entries
- **Waitlist_Entry**: A database record capturing a user's interest in a building that is not yet active on Bloom
- **Active_Property**: A property in the database with a status other than ARCHIVED
- **Onboarding_Flow**: The multi-step process a new customer completes after authentication: building selection, unit entry, and plan activation
- **Callback_Page**: A route in the Web_App (`/auth/callback`) that receives the Cognito redirect and exchanges the authorization code for tokens

## Requirements

### Requirement 1: Landing Page Cognito Redirect

**User Story:** As a visitor, I want the Register and CTA buttons on the landing page to take me to the Cognito Hosted UI, so that I can sign up or sign in using Google or email/password.

#### Acceptance Criteria

1. WHEN a visitor clicks any registration CTA button on the Landing_Page, THE Landing_Page SHALL redirect the browser to the Cognito_Hosted_UI signup URL with the correct `client_id`, `redirect_uri`, `response_type=code`, and `scope=openid email profile` parameters
2. THE Landing_Page SHALL construct the Cognito_Hosted_UI URL using environment variables for the Cognito domain and client ID
3. WHEN a visitor clicks the navigation bar "Register" button, THE Landing_Page SHALL redirect to the same Cognito_Hosted_UI signup URL

### Requirement 2: Authorization Code Exchange

**User Story:** As a user returning from Cognito, I want the app to automatically exchange my authorization code for tokens, so that I am seamlessly authenticated without additional steps.

#### Acceptance Criteria

1. WHEN the Cognito_Hosted_UI redirects to the Callback_Page with an authorization code in the URL query parameters, THE Web_App SHALL extract the authorization code from the URL
2. WHEN the Web_App receives an authorization code, THE Web_App SHALL send the code to the API token exchange endpoint
3. WHEN the API receives a valid authorization code, THE API SHALL exchange the code with Cognito's token endpoint for access, ID, and refresh tokens
4. WHEN the API successfully exchanges the authorization code, THE API SHALL extract the user's email and Cognito sub from the ID token
5. IF the authorization code is invalid or expired, THEN THE API SHALL return a 401 error with code `INVALID_AUTH_CODE`

### Requirement 3: Local User Provisioning

**User Story:** As a new user authenticated via Cognito, I want the system to automatically create my local account, so that I can proceed with onboarding without manual account setup.

#### Acceptance Criteria

1. WHEN the API successfully exchanges an authorization code and the user's email does not exist in the local database, THE API SHALL create a new user record with the email, Cognito sub as the user ID, role CUSTOMER, and subscription_status CREATED
2. WHEN the API successfully exchanges an authorization code and the user's email already exists in the local database, THE API SHALL return the existing user record and tokens without creating a duplicate
3. THE API SHALL return an access token and user object (including property_id and subscription_status) to the Web_App after successful code exchange
4. WHEN the Web_App receives the access token and user object, THE Web_App SHALL store the token in localStorage and set the authenticated user in the auth context

### Requirement 4: Post-Authentication Routing

**User Story:** As an authenticated user, I want to be automatically routed to the correct step in the onboarding flow based on my account state, so that I don't repeat steps I've already completed.

#### Acceptance Criteria

1. WHEN the Web_App authenticates a user whose property_id is null, THE Web_App SHALL navigate to the property selection page (`/onboarding/property`)
2. WHEN the Web_App authenticates a user whose property_id is set and subscription_status is CREATED, THE Web_App SHALL navigate to the subscription activation page (`/onboarding/subscription`)
3. WHEN the Web_App authenticates a user whose subscription_status is ACTIVE or PAUSED, THE Web_App SHALL navigate to the customer dashboard (`/customer`)

### Requirement 5: Waitlist Entry for Unlisted Buildings

**User Story:** As a resident whose building is not yet on Bloom, I want to tell Bloom about my building, so that Bloom can prioritize activating it and notify me when it goes live.

#### Acceptance Criteria

1. WHEN the property selection page is displayed, THE Web_App SHALL show a "My building isn't listed" option below the property list
2. WHEN a user clicks "My building isn't listed", THE Web_App SHALL display a form with fields for building name and building address
3. WHEN a user submits the waitlist form with a valid building name (1–255 characters) and address (1–500 characters), THE Web_App SHALL send the data to the API waitlist endpoint
4. WHEN the API receives a valid waitlist submission, THE API SHALL create a Waitlist_Entry record in the database with the user ID, building name, building address, and a created_at timestamp
5. WHEN the API successfully creates a Waitlist_Entry, THE API SHALL return a 201 response with the waitlist entry ID and a confirmation message
6. WHEN the Web_App receives a successful waitlist response, THE Web_App SHALL display a confirmation screen with the message "We'll notify you when your building goes live"
7. IF a user submits a waitlist entry and already has an existing waitlist entry, THEN THE API SHALL create the new entry (users may request multiple buildings)

### Requirement 6: Waitlist Database Schema

**User Story:** As a Bloom operator, I want waitlist entries stored in a structured database table, so that I can query demand signals and prioritize building activations.

#### Acceptance Criteria

1. THE API SHALL store Waitlist_Entry records in a PostgreSQL `waitlist_entries` table with columns: id (UUID primary key), user_id (UUID foreign key to users), building_name (VARCHAR 255), building_address (VARCHAR 500), status (VARCHAR 20, default PENDING), created_at (TIMESTAMPTZ)
2. THE API SHALL create the `waitlist_entries` table via an Alembic migration
3. THE API SHALL define a SQLAlchemy ORM model for the Waitlist_Entry that maps to the `waitlist_entries` table
4. WHEN a Waitlist_Entry is created, THE API SHALL set the status field to PENDING

### Requirement 7: Admin Waitlist Visibility

**User Story:** As a Bloom admin, I want to view waitlist entries, so that I can identify which buildings have the most demand and prioritize activation.

#### Acceptance Criteria

1. WHEN an admin requests the waitlist entries list, THE API SHALL return a paginated list of Waitlist_Entry records ordered by created_at descending
2. THE API SHALL include the user email, building name, building address, status, and created_at in each waitlist entry response
3. WHEN an admin requests the waitlist entries list, THE API SHALL require ADMIN role authentication

### Requirement 8: Remove Custom Registration Form

**User Story:** As a developer, I want to remove the custom email/password registration form from the Web_App, so that all authentication flows through Cognito Hosted UI and there is a single source of truth for user credentials.

#### Acceptance Criteria

1. WHEN a user navigates to `/onboarding/register` in the Web_App, THE Web_App SHALL redirect to the Cognito_Hosted_UI signup URL instead of showing the custom registration form
2. THE Web_App SHALL add a `/auth/callback` route that handles the Cognito redirect and processes the authorization code
3. THE Web_App SHALL update the router configuration to include the callback route and remove the custom registration form route
