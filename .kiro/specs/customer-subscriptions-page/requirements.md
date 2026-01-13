# Requirements Document

## Introduction

This document specifies the requirements for the Customer Subscriptions Page feature in the Bloom platform. The feature provides customers with a dedicated page to view their current subscription plan, compare available plans via a card-based UI, and perform subscription actions (activate, pause, resume, switch plans). A key requirement is that the internal `CREATED` status must never be displayed to users—instead, friendly onboarding copy is shown.

## Glossary

- **Subscription_Page**: The customer-facing page at `/customer/subscription` that displays plan cards and subscription management actions
- **Plan_Card**: A UI component displaying a single subscription plan with name, cadence, features, and action button
- **Subscription_Status**: The internal state of a customer's subscription (`CREATED`, `ACTIVE`, `PAUSED`)
- **Friendly_Status**: The customer-facing representation of subscription status that maps internal states to user-friendly language
- **Plan_Config**: Static configuration defining available subscription plans (Starter, Standard, Premium)
- **Current_Plan**: The plan currently selected/active for the customer, visually highlighted in the UI
- **Action_Button**: Contextual button on plan cards that changes based on subscription status (Activate, Pause, Resume, Switch)

## Requirements

### Requirement 1: Route Protection and Access Control

**User Story:** As a customer, I want the subscriptions page to be accessible only to authenticated customers, so that my subscription data is secure and role-appropriate.

#### Acceptance Criteria

1. WHEN an unauthenticated user navigates to `/customer/subscription` THEN THE Subscription_Page SHALL redirect to `/login`
2. WHEN a non-CUSTOMER role user navigates to `/customer/subscription` THEN THE Subscription_Page SHALL redirect to their role-specific landing page
3. WHEN an authenticated CUSTOMER navigates to `/customer/subscription` THEN THE Subscription_Page SHALL render the subscription management interface
4. THE Subscription_Page SHALL be accessible via the sidebar navigation item "My Subscription"

### Requirement 2: Status Display Mapping

**User Story:** As a customer, I want to see friendly status information instead of internal system values, so that I understand my subscription state clearly.

#### Acceptance Criteria

1. WHEN subscription_status equals `CREATED` THEN THE Subscription_Page SHALL NOT display the text "CREATED" anywhere in the UI
2. WHEN subscription_status equals `CREATED` THEN THE Subscription_Page SHALL display the subheader "Choose a plan to get started."
3. WHEN subscription_status equals `ACTIVE` THEN THE Subscription_Page SHALL display a status pill with text "Active" and the subheader "Your subscription is active."
4. WHEN subscription_status equals `PAUSED` THEN THE Subscription_Page SHALL display a status pill with text "Paused" and the subheader "Your subscription is paused."
5. THE Subscription_Page SHALL display the page title "Subscription" regardless of status

### Requirement 3: Plan Card Display

**User Story:** As a customer, I want to see available subscription plans as visual cards, so that I can easily compare options and make informed decisions.

#### Acceptance Criteria

1. THE Subscription_Page SHALL display exactly three Plan_Cards in a responsive grid layout
2. EACH Plan_Card SHALL display the plan name (Starter, Standard, or Premium)
3. EACH Plan_Card SHALL display the delivery cadence (every 4 weeks, every 2 weeks, or weekly)
4. EACH Plan_Card SHALL display a list of included features as bullet points
5. WHEN a plan is the Current_Plan THEN THE Plan_Card SHALL be visually highlighted with a distinct border or background
6. THE Plan_Cards SHALL be mobile-responsive and stack vertically on small screens

### Requirement 4: Plan Configuration

**User Story:** As a developer, I want plans defined as static configuration, so that the UI can display plan options without requiring backend changes for v1.

#### Acceptance Criteria

1. THE Plan_Config SHALL define three plans: Starter (every 4 weeks), Standard (every 2 weeks), Premium (weekly)
2. EACH plan in Plan_Config SHALL include: id, name, cadence label, and feature list
3. THE Plan_Config SHALL be stored as a TypeScript constant in the web application
4. IF pricing is not yet implemented THEN THE Plan_Card SHALL display placeholder text or omit pricing

### Requirement 5: Subscription Activation

**User Story:** As a new customer with CREATED status, I want to activate a subscription plan, so that I can start receiving flower deliveries.

#### Acceptance Criteria

1. WHEN subscription_status equals `CREATED` THEN EACH Plan_Card SHALL display an "Activate this plan" button
2. WHEN a customer clicks "Activate this plan" THEN THE Subscription_Page SHALL call `PATCH /me/subscription` with `subscription_status: 'ACTIVE'`
3. WHEN activation succeeds THEN THE Subscription_Page SHALL redirect to `/customer/home`
4. WHEN activation fails THEN THE Subscription_Page SHALL display the error message from Error_Envelope inline near the action area
5. WHILE an activation request is in flight THEN THE Action_Button SHALL be disabled and show loading state

### Requirement 6: Subscription Pause and Resume

**User Story:** As an active subscriber, I want to pause and resume my subscription, so that I can temporarily stop deliveries without canceling.

#### Acceptance Criteria

1. WHEN subscription_status equals `ACTIVE` THEN THE Current_Plan card SHALL display a "Pause subscription" button
2. WHEN a customer clicks "Pause subscription" THEN THE Subscription_Page SHALL call `PATCH /me/subscription` with `subscription_status: 'PAUSED'`
3. WHEN subscription_status equals `PAUSED` THEN THE Current_Plan card SHALL display a "Resume subscription" button
4. WHEN a customer clicks "Resume subscription" THEN THE Subscription_Page SHALL call `PATCH /me/subscription` with `subscription_status: 'ACTIVE'`
5. WHEN pause or resume succeeds THEN THE Subscription_Page SHALL update the UI to reflect the new status
6. WHEN pause or resume fails THEN THE Subscription_Page SHALL display the error message inline

### Requirement 7: Plan Switching

**User Story:** As an existing subscriber, I want to switch between plans, so that I can change my delivery frequency.

#### Acceptance Criteria

1. WHEN subscription_status equals `ACTIVE` THEN non-current Plan_Cards SHALL display a "Switch to this plan" button
2. WHEN subscription_status equals `PAUSED` THEN non-current Plan_Cards SHALL display a "Switch to this plan" button
3. WHEN a customer clicks "Switch to this plan" THEN THE Subscription_Page SHALL store the selected plan
4. IF `subscription_plan` field exists in backend THEN THE Subscription_Page SHALL persist selection via API
5. IF `subscription_plan` field does NOT exist THEN THE Subscription_Page SHALL store selection in localStorage and log a TODO

### Requirement 8: Loading and Error States

**User Story:** As a customer, I want clear feedback during loading and errors, so that I understand what's happening with my actions.

#### Acceptance Criteria

1. WHILE `getMe()` is loading THEN THE Subscription_Page SHALL display a loading skeleton
2. WHEN `getMe()` fails THEN THE Subscription_Page SHALL display an error message
3. WHILE any API request is in flight THEN THE relevant Action_Button SHALL be disabled
4. WHEN an API request fails THEN THE Subscription_Page SHALL display the error message from Error_Envelope
5. THE error message SHALL be displayed inline near the action that triggered it

### Requirement 9: Onboarding Flow Integration

**User Story:** As a new customer completing onboarding, I want to be directed to the subscriptions page to choose a plan, so that I can complete my setup.

#### Acceptance Criteria

1. WHEN a CUSTOMER has property_id set AND subscription_status equals `CREATED` THEN THE OnboardingGuard MAY redirect to `/customer/subscription` instead of `/onboarding/subscription`
2. THE Subscription_Page SHALL function correctly whether accessed via onboarding redirect or sidebar navigation
