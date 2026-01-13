# Requirements Document

## Introduction

This feature enhances the Admin Properties table to display richer information about each property, including user counts, assigned florist, assigned property manager, and a more granular status that reflects the property's readiness state. This provides admins with a comprehensive view of property onboarding progress at a glance.

## Glossary

- **Admin_UI**: The web-based administrative interface accessible only to users with ADMIN role
- **Properties_Page**: Admin page for managing property entities
- **Property_Status**: The lifecycle state of a property indicating its readiness for activation (CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE)
- **User_Subscription_Status**: The subscription state of a user (CREATED, ACTIVE, PAUSED)
- **Total_Users**: Count of all users (residents) associated with a property
- **Active_Users**: Count of users with ACTIVE subscription status at a property
- **Florist_Assignment**: The florist currently assigned to fulfill orders for a property
- **Property_Manager_Assignment**: The property manager user responsible for a property
- **Enriched_Property**: A property response that includes computed fields like user counts and assignment details

## Requirements

### Requirement 1: Enhanced Property Status Values

**User Story:** As an admin, I want to see granular property statuses, so that I can quickly identify what action is needed to activate a property.

#### Acceptance Criteria

1. THE Property_Status SHALL support the following values: CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE
2. WHEN a property is first created, THE Property_Status SHALL be set to CREATED
3. WHEN a florist is assigned to a property that has no property manager, THE Property_Status SHALL automatically transition to PENDING_PM
4. WHEN a property manager is assigned to a property that has no florist, THE Property_Status SHALL automatically transition to PENDING_FLORIST
5. WHEN a property has both a florist and property manager assigned, THE Property_Status SHALL automatically transition to ACTIVE
6. WHEN displaying status in the Admin_UI, THE Properties_Page SHALL show human-readable labels: "Created", "Pending - Needs Florist", "Pending - Needs PM", "Active"

### Requirement 2: User Subscription Status

**User Story:** As a system, I need to track user subscription states, so that I can accurately report active user counts.

#### Acceptance Criteria

1. THE User_Subscription_Status SHALL support the following values: CREATED, ACTIVE, PAUSED
2. WHEN a user creates an account but has not set up a subscription, THE User_Subscription_Status SHALL be CREATED
3. WHEN a user has an active subscription, THE User_Subscription_Status SHALL be ACTIVE
4. WHEN a user pauses their subscription, THE User_Subscription_Status SHALL be PAUSED

### Requirement 3: Property-User Association

**User Story:** As an admin, I want to see how many users are associated with each property, so that I can understand property engagement.

#### Acceptance Criteria

1. THE API SHALL support associating users with properties via a property_id field on the user record
2. WHEN listing properties, THE API SHALL return total_users count for each property (all users regardless of subscription status)
3. WHEN listing properties, THE API SHALL return active_users count for each property (only users with ACTIVE subscription status)
4. THE Properties_Page SHALL display Total Users and Active Users columns in the table
5. WHEN a property has no associated users, THE Properties_Page SHALL display "0" for both counts

### Requirement 4: Florist Assignment Display

**User Story:** As an admin, I want to see which florist is assigned to each property, so that I can manage fulfillment relationships.

#### Acceptance Criteria

1. WHEN listing properties, THE API SHALL return the assigned florist name (or null if none)
2. THE Properties_Page SHALL display a "Florist Assigned" column showing the florist name
3. WHEN a property has no florist assigned, THE Properties_Page SHALL display "—" (em dash)

### Requirement 5: Property Manager Assignment Display

**User Story:** As an admin, I want to see which property manager is assigned to each property, so that I can manage property relationships.

#### Acceptance Criteria

1. THE API SHALL support associating a property manager user with a property via a property_manager_id field on the property record
2. WHEN listing properties, THE API SHALL return the assigned property manager email (or null if none)
3. THE Properties_Page SHALL display a "Property Manager" column showing the PM email
4. WHEN a property has no property manager assigned, THE Properties_Page SHALL display "—" (em dash)

### Requirement 6: Enhanced Properties API Response

**User Story:** As a backend system, I need to provide enriched property data, so that the admin UI can display comprehensive property information.

#### Acceptance Criteria

1. THE GET /admin/properties endpoint SHALL return an Enriched_Property response with fields: id, name, address, status, delivery_cadence, total_users, active_users, florist_name, property_manager_email, created_at, updated_at
2. THE API SHALL compute total_users by counting users with matching property_id
3. THE API SHALL compute active_users by counting users with matching property_id AND subscription_status = ACTIVE
4. THE API SHALL resolve florist_name from the active property assignment
5. THE API SHALL resolve property_manager_email from the property's property_manager_id relationship

### Requirement 7: Property Manager Assignment Endpoint

**User Story:** As an admin, I want to assign a property manager to a property, so that I can establish property management relationships.

#### Acceptance Criteria

1. THE API SHALL provide a PATCH /admin/properties/{id}/assign-pm endpoint
2. WHEN assigning a property manager, THE API SHALL accept a user_id parameter
3. THE API SHALL validate that the user has PROPERTY_MANAGER role before assignment
4. IF the user does not have PROPERTY_MANAGER role, THEN THE API SHALL return a 400 Bad Request error
5. WHEN a property manager is successfully assigned, THE Property_Status SHALL automatically update based on florist assignment state

### Requirement 8: Automatic Status Computation

**User Story:** As a system, I need to automatically compute property status, so that admins always see accurate readiness state.

#### Acceptance Criteria

1. WHEN a property has no florist AND no property manager assigned, THE Property_Status SHALL be CREATED
2. WHEN a property has a florist assigned but no property manager, THE Property_Status SHALL be PENDING_PM
3. WHEN a property has a property manager assigned but no florist, THE Property_Status SHALL be PENDING_FLORIST
4. WHEN a property has both a florist AND property manager assigned, THE Property_Status SHALL be ACTIVE
5. THE Property_Status SHALL be recomputed whenever a florist assignment or property manager assignment changes

