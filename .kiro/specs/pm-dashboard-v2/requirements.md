# Requirements Document

## Introduction

This document specifies the requirements for enhancing the Property Manager (PM) Dashboard on the Bloom platform from its current basic state to a production-ready experience. The existing PM dashboard provides basic property stats, a resident list with status filters, and a client-side computed rewards tier. This enhancement adds delivery visibility, participation insights, backend-persisted rewards, and PM profile/settings management.

## Glossary

- **PM_Dashboard**: The Property Manager dashboard application accessible at `/pm/*` routes
- **Stats_API**: The backend endpoint `GET /pm/stats` that returns property and subscription statistics
- **Residents_API**: The backend endpoint `GET /pm/residents` that returns resident subscription data
- **Deliveries_API**: A new backend endpoint `GET /pm/deliveries` that returns delivery data for the PM's property
- **Rewards_API**: A new backend endpoint `GET /pm/rewards` that returns persisted rewards tier and history
- **Settings_API**: A new backend endpoint suite for PM profile and notification preferences
- **Participation_Rate**: The ratio of active subscriptions to total residents at a property, expressed as a percentage
- **Reward_Tier**: A classification (Bronze, Silver, Gold) based on the property's participation rate, persisted in the database
- **Delivery_Summary**: An aggregation of delivery records for a property showing counts by status over a time period
- **Plan_Distribution**: A breakdown of active subscriptions by plan tier (Essential, Signature, Statement)

## Requirements

### Requirement 1: Enhanced Overview with Delivery Visibility

**User Story:** As a property manager, I want to see upcoming delivery information and delivery trends on my overview page, so that I can stay informed about the floral program activity at my property.

#### Acceptance Criteria

1. WHEN a property manager loads the overview page, THE Stats_API SHALL return the next scheduled delivery date and the count of upcoming deliveries for the property
2. WHEN a property manager views the overview page, THE PM_Dashboard SHALL display the next delivery date, number of upcoming deliveries, and the delivery cadence
3. WHEN the property has past deliveries, THE Deliveries_API SHALL return a summary of deliveries grouped by status (delivered, skipped, missed) for the last 90 days
4. WHEN delivery summary data is available, THE PM_Dashboard SHALL display a delivery history section showing counts of delivered, skipped, and missed deliveries
5. IF the property has no scheduled deliveries, THEN THE PM_Dashboard SHALL display a message indicating no upcoming deliveries are scheduled

### Requirement 2: Enhanced Participation Insights

**User Story:** As a property manager, I want to see detailed participation breakdowns and plan distribution, so that I can understand resident engagement with the floral program.

#### Acceptance Criteria

1. WHEN a property manager views the participation page, THE Residents_API SHALL return plan distribution counts alongside resident data
2. WHEN plan distribution data is available, THE PM_Dashboard SHALL display a breakdown of subscriptions by plan tier (Essential, Signature, Statement)
3. WHEN a property manager views the participation page, THE PM_Dashboard SHALL display the participation rate as a percentage with a visual progress indicator
4. WHEN the resident list is displayed, THE PM_Dashboard SHALL allow sorting residents by unit number, subscription status, or plan tier
5. IF the property has zero residents, THEN THE PM_Dashboard SHALL display an empty state message indicating no residents are enrolled

### Requirement 3: Backend-Persisted Rewards Program

**User Story:** As a property manager, I want the rewards tier to be calculated and stored on the server, so that tier status is consistent and auditable.

#### Acceptance Criteria

1. THE Rewards_API SHALL compute the reward tier (Bronze, Silver, Gold) based on the property's current participation rate using thresholds: Bronze 0-49%, Silver 50-74%, Gold 75%+
2. WHEN the Rewards_API computes a tier, THE Rewards_API SHALL persist the current tier and participation rate snapshot to the database
3. WHEN a property manager requests rewards data, THE Rewards_API SHALL return the current tier, participation rate, tier benefits, and progress toward the next tier
4. WHEN the participation rate crosses a tier threshold, THE Rewards_API SHALL update the persisted tier to reflect the new classification
5. THE PM_Dashboard SHALL display the current reward tier, tier benefits, and progress toward the next tier using data from the Rewards_API

### Requirement 4: PM Settings and Profile Management

**User Story:** As a property manager, I want to manage my profile information and notification preferences, so that I can control how I interact with the Bloom platform.

#### Acceptance Criteria

1. WHEN a property manager navigates to the settings page, THE Settings_API SHALL return the PM's current profile information including email and assigned property
2. WHEN a property manager updates notification preferences, THE Settings_API SHALL persist the updated preferences to the database
3. THE PM_Dashboard SHALL display a settings page with sections for profile information and notification preferences
4. WHEN a property manager toggles a notification preference, THE PM_Dashboard SHALL send the update to the Settings_API and reflect the change in the interface
5. IF the Settings_API fails to save preferences, THEN THE PM_Dashboard SHALL display an error message and revert the toggle to its previous state

### Requirement 5: Delivery History for Property

**User Story:** As a property manager, I want to view a list of past deliveries for my property, so that I can track fulfillment quality and identify issues.

#### Acceptance Criteria

1. WHEN a property manager requests delivery history, THE Deliveries_API SHALL return deliveries for the PM's property sorted by scheduled date in descending order
2. THE Deliveries_API SHALL support pagination with a configurable page size defaulting to 20 records
3. WHEN delivery records are returned, THE Deliveries_API SHALL include the resident email, unit number, subscription plan, delivery status, and scheduled date for each delivery
4. WHEN a property manager filters deliveries by status, THE Deliveries_API SHALL return only deliveries matching the specified status
5. THE PM_Dashboard SHALL display delivery history in a table with status filter tabs matching the delivery statuses (Scheduled, Delivered, Skipped, Missed)

### Requirement 6: API Authorization and Data Scoping

**User Story:** As a platform operator, I want all PM endpoints to enforce role-based access and scope data to the PM's assigned property, so that data isolation is maintained.

#### Acceptance Criteria

1. THE Stats_API, Residents_API, Deliveries_API, Rewards_API, and Settings_API SHALL require a valid JWT token with the PROPERTY_MANAGER role
2. WHEN a PM endpoint receives a request, THE endpoint SHALL scope all data queries to the property assigned to the authenticated property manager
3. IF a property manager has no assigned property, THEN THE endpoint SHALL return an empty response with appropriate default values
4. IF a request lacks a valid JWT token or has an incorrect role, THEN THE endpoint SHALL return a 401 or 403 HTTP status code

