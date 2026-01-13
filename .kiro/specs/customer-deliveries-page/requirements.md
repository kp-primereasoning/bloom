# Requirements Document

## Introduction

This document defines the requirements for the Customer Deliveries Page feature in the Bloom platform. The page provides customers with a modern, card-first interface to view their upcoming and past deliveries, track delivery status, and access support options.

## Glossary

- **Deliveries_Page**: The customer-facing page at `/customer/deliveries` displaying delivery information
- **Delivery**: A scheduled or completed floral delivery to a customer's property
- **Next_Delivery_Card**: The primary card component showing the customer's upcoming delivery
- **Delivery_History_Card**: A card containing a table of past deliveries
- **Subscription_Status**: The customer's current subscription state (ACTIVE, PAUSED, CREATED)
- **Delivery_Status**: The state of a delivery (SCHEDULED, DELIVERED, SKIPPED, MISSED)
- **Subscription_Plan**: The customer's plan tier (ESSENTIAL, SIGNATURE, STATEMENT)
- **Error_Envelope**: The standard API error response format used across the platform

## Requirements

### Requirement 1: Deliveries Data Model

**User Story:** As a system administrator, I want deliveries stored in a structured database table, so that delivery information can be tracked and queried reliably.

#### Acceptance Criteria

1. THE Database SHALL store deliveries with id (UUID primary key), user_id (FK to users), property_id (FK to properties), subscription_plan, status, scheduled_for, delivered_at, created_at, updated_at, and archived_at fields
2. THE Delivery model SHALL use enum types for subscription_plan (ESSENTIAL, SIGNATURE, STATEMENT) and status (SCHEDULED, DELIVERED, SKIPPED, MISSED)
3. THE Delivery model SHALL support soft delete via nullable archived_at timestamp
4. WHEN a migration is created THEN the Database SHALL apply it idempotently without data loss

### Requirement 2: Customer Deliveries API Endpoint

**User Story:** As a customer, I want to retrieve my delivery information via API, so that the frontend can display my upcoming and past deliveries.

#### Acceptance Criteria

1. WHEN a CUSTOMER calls GET /me/deliveries THEN the API SHALL return a response containing next_delivery (nullable) and history (list of deliveries)
2. THE API SHALL return history sorted by scheduled_for descending with a limit of 20 deliveries
3. THE API SHALL exclude archived deliveries from both next_delivery and history
4. WHEN a non-CUSTOMER role calls GET /me/deliveries THEN the API SHALL return a 403 Forbidden error in Error_Envelope format
5. WHEN an unauthenticated user calls GET /me/deliveries THEN the API SHALL return a 401 Unauthorized error in Error_Envelope format

### Requirement 3: Seed Data for Deliveries

**User Story:** As a developer, I want seed data for deliveries, so that I can test the deliveries page with realistic data.

#### Acceptance Criteria

1. WHEN seed is executed THEN the Seeder SHALL create 1 future SCHEDULED delivery for some CUSTOMER users
2. WHEN seed is executed THEN the Seeder SHALL create 2-5 past deliveries with varied statuses for some CUSTOMER users
3. THE Seeder SHALL be idempotent and not create duplicate deliveries on repeated execution

### Requirement 4: Shared Types for Deliveries

**User Story:** As a developer, I want shared TypeScript types for deliveries, so that frontend and backend maintain type consistency.

#### Acceptance Criteria

1. THE Shared_Package SHALL export SubscriptionPlan enum with values ESSENTIAL, SIGNATURE, STATEMENT
2. THE Shared_Package SHALL export DeliveryStatus enum with values SCHEDULED, DELIVERED, SKIPPED, MISSED
3. THE Shared_Package SHALL export Delivery type with all delivery fields
4. THE Shared_Package SHALL export MeDeliveriesResponse type containing next_delivery (Delivery | null) and history (Delivery[])

### Requirement 5: API Client for Deliveries

**User Story:** As a frontend developer, I want an API client method for deliveries, so that I can fetch delivery data from the page component.

#### Acceptance Criteria

1. THE API_Client SHALL provide a getMyDeliveries() method returning Promise<MeDeliveriesResponse>
2. WHEN getMyDeliveries() fails THEN the API_Client SHALL throw an error with parsed Error_Envelope details

### Requirement 6: Deliveries Page Route and Access Control

**User Story:** As a customer, I want to access the deliveries page at /customer/deliveries, so that I can view my delivery information.

#### Acceptance Criteria

1. WHEN a CUSTOMER navigates to /customer/deliveries THEN the Router SHALL render the DeliveriesPage component
2. WHEN a non-CUSTOMER role navigates to /customer/deliveries THEN the Router SHALL redirect to the appropriate role landing page
3. WHEN an unauthenticated user navigates to /customer/deliveries THEN the Router SHALL redirect to the login page

### Requirement 7: Page Header Card

**User Story:** As a customer, I want to see a header card with page title and my subscription status, so that I understand the page context at a glance.

#### Acceptance Criteria

1. THE Header_Card SHALL display title "Deliveries" and subtitle "Track upcoming and past deliveries."
2. THE Header_Card SHALL display a status chip showing subscription_status from /auth/me
3. WHEN subscription_status is ACTIVE THEN the Status_Chip SHALL display "ACTIVE"
4. WHEN subscription_status is PAUSED THEN the Status_Chip SHALL display "PAUSED"
5. WHEN subscription_status is CREATED THEN the Status_Chip SHALL display "NOT ACTIVE"

### Requirement 8: Next Delivery Card

**User Story:** As a customer, I want to see my next scheduled delivery prominently, so that I know when to expect my flowers.

#### Acceptance Criteria

1. WHEN next_delivery exists THEN the Next_Delivery_Card SHALL display the scheduled date prominently
2. WHEN next_delivery is null THEN the Next_Delivery_Card SHALL display "Coming soon"
3. THE Next_Delivery_Card SHALL contain a table with columns: Property, Delivery window, Plan, Status
4. WHEN subscription_status is PAUSED THEN the Next_Delivery_Card SHALL show a "Resume Subscription" button linking to /customer/subscription
5. WHEN subscription_status is CREATED THEN the Next_Delivery_Card SHALL show an "Activate Subscription" button linking to /customer/subscription
6. WHEN subscription_status is ACTIVE THEN the Next_Delivery_Card SHALL show a disabled "All set" button

### Requirement 9: Delivery History Card

**User Story:** As a customer, I want to see my past deliveries in a table, so that I can review my delivery history.

#### Acceptance Criteria

1. THE Delivery_History_Card SHALL contain a table with columns: Date, Status, Plan, Notes, Details
2. THE Delivery_History_Card SHALL display deliveries sorted by date descending (most recent first)
3. WHEN history is empty THEN the Delivery_History_Card SHALL display "No deliveries yet." as an empty state
4. THE Status column SHALL display delivery status with appropriate styling (Delivered, Missed, Skipped)

### Requirement 10: Support Card

**User Story:** As a customer, I want quick access to support options, so that I can get help with delivery issues.

#### Acceptance Criteria

1. THE Support_Card SHALL display text "Issues with a delivery? Contact support."
2. THE Support_Card SHALL contain an "Email support" button
3. THE Support_Card SHALL contain an "FAQ" link

### Requirement 11: Loading and Error States

**User Story:** As a customer, I want clear feedback during loading and errors, so that I understand the page state.

#### Acceptance Criteria

1. WHILE data is loading THEN the Deliveries_Page SHALL display skeleton cards
2. WHEN an API error occurs THEN the Deliveries_Page SHALL display an inline error message within the relevant card
3. THE Error_Display SHALL parse and show Error_Envelope details from failed API calls

### Requirement 12: Visual Design Consistency

**User Story:** As a customer, I want a modern, techy interface, so that the page feels like a polished product.

#### Acceptance Criteria

1. THE Cards SHALL have subtle borders, soft shadows, and consistent padding
2. THE Tables SHALL be minimal, high density, and techy in appearance
3. THE Status_Chips SHALL use consistent styling across the page
4. THE Deliveries_Page SHALL use existing Tailwind patterns without external UI libraries
