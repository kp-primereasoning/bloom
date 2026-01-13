# Requirements Document

## Introduction

The Customer Account page provides authenticated customers with a read-only view of their profile information, building assignment, and placeholder billing section. This page serves as a central hub for account-related information while keeping subscription management on the dedicated Subscriptions page.

## Glossary

- **Account_Page**: The customer-facing page at `/customer/account` displaying profile, building, and billing information
- **Profile_Card**: A read-only card displaying user email, role (optional), and member since date
- **Building_Card**: A read-only card showing the customer's assigned property with CTA for selection/change
- **Billing_Card**: A placeholder card for future Stripe integration with disabled action buttons
- **Support_Card**: A simple card with FAQ and email support links
- **MeResponse**: The API response from `GET /auth/me` containing user data including `property_name`

## Requirements

### Requirement 1: Route and Navigation

**User Story:** As a customer, I want to access my account page from the sidebar, so that I can view my profile and building information.

#### Acceptance Criteria

1. THE Account_Page SHALL be accessible at route `/customer/account`
2. THE Sidebar SHALL display an "Account" link under Customer navigation pointing to `/customer/account`
3. WHEN an unauthenticated user navigates to `/customer/account`, THE System SHALL redirect to `/login`
4. WHEN a non-CUSTOMER user navigates to `/customer/account`, THE System SHALL redirect to their role's default landing page

### Requirement 2: Page Data Loading

**User Story:** As a customer, I want my account page to load my profile data, so that I can see my current information.

#### Acceptance Criteria

1. WHEN the Account_Page loads, THE System SHALL fetch user data from `GET /auth/me`
2. WHILE data is loading, THE Account_Page SHALL display a loading skeleton
3. IF the API request fails, THEN THE Account_Page SHALL display an error message with retry option

### Requirement 3: Profile Card Display

**User Story:** As a customer, I want to see my profile information, so that I can verify my account details.

#### Acceptance Criteria

1. THE Profile_Card SHALL display the page title "Account"
2. THE Profile_Card SHALL display user email in a 2-column table format
3. THE Profile_Card SHALL display "Member since" with the formatted `created_at` date
4. THE Profile_Card SHALL be read-only with no edit functionality

### Requirement 4: Building Card Display

**User Story:** As a customer, I want to see my assigned building, so that I know where my deliveries will be sent.

#### Acceptance Criteria

1. THE Building_Card SHALL display "Building" label with `property_name` value
2. WHEN `property_id` is null, THE Building_Card SHALL display "Not selected" for building value
3. WHEN `property_id` is null, THE Building_Card SHALL display a "Select your building" CTA button
4. WHEN the "Select your building" button is clicked, THE System SHALL navigate to `/onboarding/property`
5. WHEN `property_id` is set, THE Building_Card SHALL display a "Change building" link
6. WHEN the "Change building" link is clicked, THE System SHALL navigate to `/onboarding/property`

### Requirement 5: Billing Card Placeholder

**User Story:** As a customer, I want to see a billing section placeholder, so that I know payment management is coming.

#### Acceptance Criteria

1. THE Billing_Card SHALL display text "Billing is coming soon. You'll manage payment methods and invoices here."
2. THE Billing_Card SHALL display an "Update payment method" button in disabled state
3. THE Billing_Card SHALL display a "View invoices" button in disabled state
4. THE disabled buttons SHALL be visually distinguishable as non-interactive

### Requirement 6: Support Card Display

**User Story:** As a customer, I want quick access to support options, so that I can get help when needed.

#### Acceptance Criteria

1. THE Support_Card SHALL display a link to the FAQ page at `/customer/help`
2. THE Support_Card SHALL display an email link to `mailto:support@bloom.com?subject=Bloom%20Support`

### Requirement 7: No Subscription UI

**User Story:** As a product owner, I want subscription management to remain on the Subscriptions page, so that the Account page stays focused on profile information.

#### Acceptance Criteria

1. THE Account_Page SHALL NOT display any subscription status information
2. THE Account_Page SHALL NOT display any subscription management controls
3. THE Account_Page SHALL NOT display any plan selection or upgrade options
