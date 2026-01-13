# Requirements Document

## Introduction

This document specifies the requirements for a self-service customer onboarding flow in the Bloom platform. The flow enables new customers to register, select their apartment property, configure their subscription, and access their dashboard—all without admin intervention. The marketing site's "Sign up" button will link directly into this flow.

## Glossary

- **Onboarding_Flow**: The multi-step process guiding new customers from registration through subscription activation
- **Customer**: A user with role=CUSTOMER who subscribes to floral deliveries at their property
- **Property**: An apartment complex participating in Bloom's floral subscription program
- **Subscription_Status**: The lifecycle state of a customer's subscription (CREATED, ACTIVE, PAUSED)
- **Progress_Header**: A visual indicator showing the current step in the onboarding process
- **Deep_Link**: A URL with optional query parameters for pre-filling onboarding data

## Requirements

### Requirement 1: Customer Self-Registration

**User Story:** As a prospective customer, I want to create my own account, so that I can start using Bloom without waiting for admin approval.

#### Acceptance Criteria

1. THE Registration_Endpoint SHALL accept email and password via `POST /auth/register`
2. WHEN a valid registration request is received, THE Registration_Endpoint SHALL create a user with role=CUSTOMER, subscription_status=CREATED, and property_id=null
3. WHEN registration succeeds, THE Registration_Endpoint SHALL return an access_token, token_type, and user object (same format as login)
4. WHEN a duplicate email is submitted, THE Registration_Endpoint SHALL return HTTP 409 with Error_Envelope containing request_id
5. WHEN an invalid email format is submitted, THE Registration_Endpoint SHALL return HTTP 422 with validation error details
6. THE Registration_Endpoint SHALL be publicly accessible without authentication

### Requirement 2: Public Property Listing

**User Story:** As a new customer, I want to see available apartment complexes, so that I can select where I live.

#### Acceptance Criteria

1. THE Properties_List_Endpoint SHALL be accessible via `GET /properties` without authentication
2. WHEN properties are requested, THE Properties_List_Endpoint SHALL return a list containing id, name, and address for each property
3. THE Properties_List_Endpoint SHALL exclude properties with ARCHIVED status
4. THE Properties_List_Endpoint SHALL return an empty array if no non-archived properties exist

### Requirement 3: Customer Property Assignment

**User Story:** As a registered customer, I want to select my apartment complex, so that I can receive deliveries at my location.

#### Acceptance Criteria

1. THE Property_Assignment_Endpoint SHALL accept property_id via `PATCH /me/property`
2. THE Property_Assignment_Endpoint SHALL require valid JWT authentication with CUSTOMER role
3. WHEN a non-CUSTOMER role attempts assignment, THE Property_Assignment_Endpoint SHALL return HTTP 403
4. WHEN a valid property_id is submitted, THE Property_Assignment_Endpoint SHALL update the user's property_id and return the updated user
5. WHEN an invalid or non-existent property_id is submitted, THE Property_Assignment_Endpoint SHALL return HTTP 400
6. WHEN an ARCHIVED property_id is submitted, THE Property_Assignment_Endpoint SHALL return HTTP 400

### Requirement 4: Customer Subscription Configuration

**User Story:** As a customer with a selected property, I want to activate my subscription, so that I can start receiving floral deliveries.

#### Acceptance Criteria

1. THE Subscription_Endpoint SHALL accept subscription_status via `PATCH /me/subscription`
2. THE Subscription_Endpoint SHALL require valid JWT authentication with CUSTOMER role
3. WHEN a non-CUSTOMER role attempts update, THE Subscription_Endpoint SHALL return HTTP 403
4. THE Subscription_Endpoint SHALL only accept ACTIVE or PAUSED as valid subscription_status values
5. WHEN CREATED is submitted as subscription_status, THE Subscription_Endpoint SHALL return HTTP 400
6. WHEN a valid status is submitted, THE Subscription_Endpoint SHALL update the user's subscription_status and return the updated user

### Requirement 5: Onboarding Route Navigation

**User Story:** As a customer at any stage of onboarding, I want to be automatically directed to the correct step, so that I can complete my setup efficiently.

#### Acceptance Criteria

1. THE Onboarding_Router SHALL provide routes at `/onboarding/register`, `/onboarding/property`, `/onboarding/subscription`, and `/onboarding/complete`
2. WHEN an unauthenticated user accesses any onboarding route except `/onboarding/register`, THE Onboarding_Router SHALL redirect to `/onboarding/register`
3. WHEN an authenticated non-CUSTOMER user accesses any onboarding route, THE Onboarding_Router SHALL redirect to their role's landing page
4. WHEN an authenticated CUSTOMER with no property_id accesses the app, THE Onboarding_Router SHALL redirect to `/onboarding/property`
5. WHEN an authenticated CUSTOMER with property_id and subscription_status=CREATED accesses the app, THE Onboarding_Router SHALL redirect to `/onboarding/subscription`
6. WHEN an authenticated CUSTOMER with property_id and subscription_status in {ACTIVE, PAUSED} accesses onboarding routes, THE Onboarding_Router SHALL redirect to `/customer`

### Requirement 6: Onboarding Progress Indicator

**User Story:** As a customer going through onboarding, I want to see my progress, so that I know how many steps remain.

#### Acceptance Criteria

1. THE Progress_Header SHALL display on all onboarding pages
2. THE Progress_Header SHALL show the current step number and total steps (e.g., "Step 1 of 3")
3. THE Progress_Header SHALL visually indicate which steps are complete, current, and remaining

### Requirement 7: Registration Page

**User Story:** As a new visitor, I want a clear registration form, so that I can create my account quickly.

#### Acceptance Criteria

1. THE Registration_Page SHALL display email and password input fields
2. THE Registration_Page SHALL support pre-filling email from `?email=` query parameter
3. WHEN the form is submitted successfully, THE Registration_Page SHALL store the token via AuthProvider and redirect to `/onboarding/property`
4. WHEN registration fails, THE Registration_Page SHALL display the error message from the API response
5. THE Registration_Page SHALL disable the submit button while the request is in progress

### Requirement 8: Property Selection Page

**User Story:** As a registered customer, I want to browse and select my apartment complex, so that I can associate my account with my residence.

#### Acceptance Criteria

1. THE Property_Selection_Page SHALL fetch and display the list of available properties
2. THE Property_Selection_Page SHALL provide a search/filter mechanism for finding properties
3. THE Property_Selection_Page SHALL support pre-selecting a property from `?property_id=` query parameter
4. WHEN a property is selected and confirmed, THE Property_Selection_Page SHALL call `PATCH /me/property` and redirect to `/onboarding/subscription`
5. WHEN the API call fails, THE Property_Selection_Page SHALL display the error message

### Requirement 9: Subscription Configuration Page

**User Story:** As a customer with a selected property, I want to activate my subscription with minimal friction, so that I can start receiving flowers.

#### Acceptance Criteria

1. THE Subscription_Page SHALL display a summary of the selected property
2. THE Subscription_Page SHALL provide an "Activate Subscription" button
3. WHEN the activate button is clicked, THE Subscription_Page SHALL call `PATCH /me/subscription` with subscription_status=ACTIVE
4. WHEN activation succeeds, THE Subscription_Page SHALL redirect to `/customer`
5. WHEN activation fails, THE Subscription_Page SHALL display the error message

### Requirement 10: Customer Dashboard Integration

**User Story:** As an onboarded customer, I want my dashboard to show my subscription status and property, so that I can verify my setup is complete.

#### Acceptance Criteria

1. THE Customer_Dashboard SHALL display the customer's subscription_status
2. THE Customer_Dashboard SHALL display the customer's property name
3. WHEN property_id is null, THE Customer_Dashboard SHALL show a call-to-action linking to `/onboarding/property`
4. WHEN subscription_status is CREATED, THE Customer_Dashboard SHALL show a call-to-action linking to `/onboarding/subscription`

### Requirement 11: Marketing Site Deep Link Support

**User Story:** As a marketing site visitor, I want the "Sign up" button to take me directly into Bloom's onboarding, so that my transition is seamless.

#### Acceptance Criteria

1. THE Onboarding_Flow SHALL accept deep links to `https://<domain>/onboarding/register`
2. THE Registration_Page SHALL parse and apply `?email=<value>` to pre-fill the email field
3. THE Registration_Page SHALL parse and store `?property_id=<value>` for use after registration
4. WHEN property_id is provided via query parameter and is valid, THE Property_Selection_Page SHALL pre-select that property

### Requirement 12: API Error Handling

**User Story:** As a customer, I want clear error messages, so that I can understand and resolve issues during onboarding.

#### Acceptance Criteria

1. THE Onboarding_Endpoints SHALL return errors in Error_Envelope format with request_id
2. WHEN validation fails, THE Onboarding_Endpoints SHALL return HTTP 400 or 422 with descriptive messages
3. WHEN authentication fails, THE Onboarding_Endpoints SHALL return HTTP 401
4. WHEN authorization fails, THE Onboarding_Endpoints SHALL return HTTP 403

### Requirement 13: TypeScript Types and API Client

**User Story:** As a frontend developer, I want typed API methods, so that I can integrate onboarding endpoints safely.

#### Acceptance Criteria

1. THE Shared_Types SHALL include PropertyListItem with id, name, and address fields
2. THE Shared_Types SHALL include RegisterRequest with email and password fields
3. THE Shared_Types SHALL include RegisterResponse matching LoginResponse structure
4. THE Shared_Types SHALL include MePropertyUpdateRequest with property_id field
5. THE Shared_Types SHALL include MeSubscriptionUpdateRequest with subscription_status field
6. THE API_Client SHALL provide methods for register, listProperties, updateMyProperty, and updateMySubscription
