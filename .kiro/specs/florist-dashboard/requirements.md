# Requirements Document

## Introduction

This document specifies the requirements for the Florist Dashboard in the Bloom platform. The dashboard provides florists with visibility into their assigned properties, upcoming deliveries, and tools to manage their fulfillment operations. Florists connect their existing Shopify stores to Bloom and fulfill deliveries based on Bloom-generated orders.

## Glossary

- **Florist_Dashboard**: The main landing page for authenticated florists at `/florist/deliveries`
- **Florist**: A flower vendor connected to the Bloom platform who fulfills deliveries for assigned properties
- **Property_Assignment**: The relationship linking a Florist to a Property for fulfillment
- **Delivery**: A scheduled or completed floral delivery to a customer's property
- **Delivery_Status**: The lifecycle state of a delivery (SCHEDULED, DELIVERED, SKIPPED, MISSED)
- **Subscription_Plan**: The customer's selected tier (ESSENTIAL, SIGNATURE, STATEMENT)
- **Florist_Status**: The lifecycle state of a florist (ONBOARDING, READY, ARCHIVED)

## Requirements

### Requirement 1: Florist Me Endpoint

**User Story:** As a florist, I want the API to return my florist profile with assigned properties, so that the dashboard can display my assignments without additional API calls.

#### Acceptance Criteria

1. THE Florist_Me_Endpoint SHALL return florist_id, florist_name, and florist_status for the authenticated florist user
2. WHEN the florist has active property assignments, THE Florist_Me_Endpoint SHALL return a list of assigned properties with property_id, property_name, and property_address
3. WHEN the florist has no active assignments, THE Florist_Me_Endpoint SHALL return an empty assigned_properties array
4. THE Florist_Me_Endpoint SHALL require valid JWT authentication with FLORIST role
5. THE Florist_Me_Endpoint SHALL be accessible via `GET /florist/me`

### Requirement 2: Florist Deliveries List Endpoint

**User Story:** As a florist, I want to see all upcoming deliveries for my assigned properties, so that I can plan my fulfillment operations.

#### Acceptance Criteria

1. THE Florist_Deliveries_Endpoint SHALL return all SCHEDULED deliveries for the florist's assigned properties
2. THE Florist_Deliveries_Endpoint SHALL include customer email, property_name, property_address, subscription_plan, and scheduled_for date for each delivery
3. THE Florist_Deliveries_Endpoint SHALL order deliveries by scheduled_for date ascending (soonest first)
4. THE Florist_Deliveries_Endpoint SHALL only return deliveries for properties where the florist has an active assignment
5. THE Florist_Deliveries_Endpoint SHALL require valid JWT authentication with FLORIST role
6. THE Florist_Deliveries_Endpoint SHALL be accessible via `GET /florist/deliveries`

### Requirement 3: Mark Delivery as Delivered

**User Story:** As a florist, I want to mark a delivery as completed, so that the customer and platform know the order was fulfilled.

#### Acceptance Criteria

1. WHEN a florist marks a delivery as DELIVERED, THE System SHALL update the delivery status to DELIVERED
2. WHEN a florist marks a delivery as DELIVERED, THE System SHALL set the delivered_at timestamp to the current time
3. THE System SHALL only allow florists to update deliveries for their assigned properties
4. IF a florist attempts to update a delivery for an unassigned property, THEN THE System SHALL return HTTP 403
5. THE Mark_Delivery_Endpoint SHALL require valid JWT authentication with FLORIST role
6. THE Mark_Delivery_Endpoint SHALL be accessible via `PATCH /florist/deliveries/{delivery_id}`

### Requirement 4: Mark Delivery as Missed

**User Story:** As a florist, I want to mark a delivery as missed when I couldn't complete it, so that the platform can track fulfillment issues.

#### Acceptance Criteria

1. WHEN a florist marks a delivery as MISSED, THE System SHALL update the delivery status to MISSED
2. THE System SHALL only allow florists to update deliveries for their assigned properties
3. IF a florist attempts to update a delivery for an unassigned property, THEN THE System SHALL return HTTP 403
4. THE System SHALL only allow status transitions from SCHEDULED to MISSED or DELIVERED

### Requirement 5: Florist Deliveries Page Display

**User Story:** As a florist, I want to see my upcoming deliveries in a clear table format, so that I can efficiently manage my fulfillment schedule.

#### Acceptance Criteria

1. THE Florist_Deliveries_Page SHALL display a table with columns: Delivery Date, Property, Customer, Plan, and Actions
2. THE Florist_Deliveries_Page SHALL show a loading state while fetching delivery data
3. WHEN no deliveries are scheduled, THE Florist_Deliveries_Page SHALL display an empty state message
4. THE Florist_Deliveries_Page SHALL display inline error messages when API calls fail
5. THE Florist_Deliveries_Page SHALL provide "Mark Delivered" and "Mark Missed" action buttons for each delivery

### Requirement 6: Delivery Action Feedback

**User Story:** As a florist, I want immediate feedback when I mark a delivery, so that I know my action was recorded.

#### Acceptance Criteria

1. WHEN a florist clicks an action button, THE System SHALL disable the button and show a loading indicator
2. WHEN the action succeeds, THE System SHALL remove the delivery from the upcoming list
3. WHEN the action fails, THE System SHALL display an error message near the action area
4. THE System SHALL not require a page refresh to see updated delivery status

### Requirement 7: Florist Settings Page

**User Story:** As a florist, I want to view my account settings and Shopify connection status, so that I can manage my integration.

#### Acceptance Criteria

1. THE Florist_Settings_Page SHALL display the florist's business name
2. THE Florist_Settings_Page SHALL display the florist's current status (ONBOARDING, READY, ARCHIVED)
3. THE Florist_Settings_Page SHALL display a list of assigned properties with their names and addresses
4. THE Florist_Settings_Page SHALL display a placeholder for Shopify integration status (future feature)

### Requirement 8: Route Protection

**User Story:** As a non-florist user, I want to be redirected away from the florist dashboard, so that I see content appropriate to my role.

#### Acceptance Criteria

1. WHEN a non-FLORIST role accesses `/florist/*`, THE Router SHALL redirect to their role's landing page
2. WHEN an unauthenticated user accesses `/florist/*`, THE Router SHALL redirect to `/login`

### Requirement 9: Florist Availability Page

**User Story:** As a florist, I want to set my delivery capacity, so that Bloom knows how many deliveries I can handle.

#### Acceptance Criteria

1. THE Florist_Availability_Page SHALL display the florist's current weekly delivery capacity
2. THE Florist_Availability_Page SHALL allow florists to update their weekly delivery capacity
3. WHEN capacity is updated, THE System SHALL persist the change via API
4. THE Florist_Availability_Page SHALL display a placeholder for delivery windows (future feature)

### Requirement 10: Product Mapping Page

**User Story:** As a florist, I want to see how my Shopify products map to Bloom subscription tiers, so that I know what to fulfill for each plan.

#### Acceptance Criteria

1. THE Product_Mapping_Page SHALL display a placeholder explaining the Shopify integration concept
2. THE Product_Mapping_Page SHALL indicate that product mapping is a future feature
3. THE Product_Mapping_Page SHALL display the three subscription tiers (ESSENTIAL, SIGNATURE, STATEMENT)
