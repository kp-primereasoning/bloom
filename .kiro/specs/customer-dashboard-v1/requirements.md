# Requirements Document

## Introduction

This document specifies the requirements for Customer Dashboard v1 in the Bloom platform. The dashboard provides customers with a clear view of their subscription status, property information, and actionable controls to pause or resume their subscription. It also guides incomplete onboarding users back to the appropriate onboarding step.

## Glossary

- **Customer_Dashboard**: The main landing page for authenticated customers at `/customer`
- **Subscription_Status**: The lifecycle state of a customer's subscription (CREATED, ACTIVE, PAUSED)
- **Me_Endpoint**: The API endpoint returning the current user's profile with enriched data
- **Property_Name**: The human-readable name of the customer's assigned property, resolved server-side
- **Action_Button**: A contextual button that changes based on the customer's current state

## Requirements

### Requirement 1: Enriched Me Endpoint

**User Story:** As a customer, I want the API to return my property name along with my profile, so that the dashboard can display it without additional API calls.

#### Acceptance Criteria

1. THE Me_Endpoint SHALL return property_name as a nullable string field alongside existing user fields
2. WHEN the user has a property_id, THE Me_Endpoint SHALL resolve property_name by joining with the Property table
3. WHEN the user has no property_id, THE Me_Endpoint SHALL return property_name as null
4. THE Me_Endpoint SHALL require valid JWT authentication
5. THE Me_Endpoint SHALL be accessible via `GET /auth/me` or equivalent existing endpoint

### Requirement 2: Customer Dashboard Display

**User Story:** As a customer, I want to see my subscription status and property information on my dashboard, so that I can understand my current state at a glance.

#### Acceptance Criteria

1. THE Customer_Dashboard SHALL display the customer's property name or a placeholder if not set
2. THE Customer_Dashboard SHALL display the customer's subscription_status with a visual status pill
3. THE Customer_Dashboard SHALL display a "Next delivery" section with placeholder text "Coming soon"
4. THE Customer_Dashboard SHALL show a loading state while fetching user data
5. THE Customer_Dashboard SHALL display inline error messages when API calls fail

### Requirement 3: Contextual Action Buttons

**User Story:** As a customer, I want action buttons that guide me to the next appropriate step, so that I can complete onboarding or manage my subscription.

#### Acceptance Criteria

1. WHEN property_id is null, THE Customer_Dashboard SHALL display a "Select your building" button linking to `/onboarding/property`
2. WHEN property_id is set AND subscription_status is CREATED, THE Customer_Dashboard SHALL display an "Activate subscription" button linking to `/onboarding/subscription`
3. WHEN subscription_status is ACTIVE, THE Customer_Dashboard SHALL display a "Pause subscription" button that calls `PATCH /me/subscription` with PAUSED
4. WHEN subscription_status is PAUSED, THE Customer_Dashboard SHALL display a "Resume subscription" button that calls `PATCH /me/subscription` with ACTIVE
5. WHEN an action button triggers an API call, THE Customer_Dashboard SHALL disable the button and show loading state
6. WHEN an API call fails, THE Customer_Dashboard SHALL display the error message near the action area

### Requirement 4: Subscription Update API Validation

**User Story:** As a system administrator, I want the subscription update endpoint to enforce business rules, so that invalid state transitions are prevented.

#### Acceptance Criteria

1. THE Subscription_Endpoint SHALL accept only ACTIVE or PAUSED as valid subscription_status values
2. WHEN CREATED is submitted as subscription_status, THE Subscription_Endpoint SHALL return HTTP 400 with descriptive error
3. THE Subscription_Endpoint SHALL require CUSTOMER role; non-customers receive HTTP 403
4. THE Subscription_Endpoint SHALL return the updated user object on success
5. THE Subscription_Endpoint SHALL return errors in Error_Envelope format with request_id

### Requirement 5: Shared Types and API Client

**User Story:** As a frontend developer, I want typed API methods for the dashboard, so that I can integrate safely with TypeScript.

#### Acceptance Criteria

1. THE Shared_Types SHALL export SubscriptionStatus enum with CREATED, ACTIVE, and PAUSED values
2. THE Shared_Types SHALL export MeResponse type including property_name as nullable string
3. THE Shared_Types SHALL export UpdateMySubscriptionRequest type with subscription_status field
4. THE API_Client SHALL provide getMe() method returning Promise<MeResponse>
5. THE API_Client SHALL provide updateMySubscription(status) method returning Promise<MeResponse>

### Requirement 6: Route Protection

**User Story:** As a non-customer user, I want to be redirected away from the customer dashboard, so that I see content appropriate to my role.

#### Acceptance Criteria

1. WHEN a non-CUSTOMER role accesses `/customer`, THE Router SHALL redirect to their role's landing page
2. WHEN an unauthenticated user accesses `/customer`, THE Router SHALL redirect to `/login`

