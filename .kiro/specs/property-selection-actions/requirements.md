# Requirements Document

## Introduction

This feature adds row selection capability to the admin Properties table, enabling contextual actions like editing property details and assigning florists or property managers. When a property is selected, the "Add Property" button transforms into action buttons for the selected property.

## Glossary

- **Properties_Table**: The admin interface table displaying all properties with enriched data
- **Selection_Column**: A checkbox column allowing single property selection
- **Action_Bar**: The button area that changes based on selection state
- **Assign_Florist_Modal**: Dialog for selecting and assigning a florist to a property
- **Assign_PM_Modal**: Dialog for selecting and assigning a property manager to a property
- **Edit_Property_Modal**: Dialog for editing property details (name, address, delivery cadence)

## Requirements

### Requirement 1: Property Row Selection

**User Story:** As an admin, I want to select a property row, so that I can perform actions on that specific property.

#### Acceptance Criteria

1. THE Properties_Table SHALL display a checkbox column as the first column
2. WHEN an admin clicks a row's checkbox, THE Properties_Table SHALL mark that row as selected with visual highlighting
3. WHEN a property is selected and the admin clicks another property's checkbox, THE Properties_Table SHALL deselect the previous property and select the new one (single selection only)
4. WHEN an admin clicks a selected property's checkbox, THE Properties_Table SHALL deselect that property

### Requirement 2: Dynamic Action Bar

**User Story:** As an admin, I want the action buttons to change based on my selection, so that I can quickly access relevant actions.

#### Acceptance Criteria

1. WHILE no property is selected, THE Action_Bar SHALL display only the "Add Property" button
2. WHILE a property is selected, THE Action_Bar SHALL display "Edit Property", "Assign Florist", and "Assign PM" buttons
3. WHILE a property is selected, THE Action_Bar SHALL hide the "Add Property" button
4. WHEN a property is deselected, THE Action_Bar SHALL return to showing only the "Add Property" button

### Requirement 3: Edit Property Modal

**User Story:** As an admin, I want to edit a property's details, so that I can correct or update property information.

#### Acceptance Criteria

1. WHEN an admin clicks "Edit Property" with a property selected, THE Edit_Property_Modal SHALL open pre-populated with the selected property's data
2. THE Edit_Property_Modal SHALL allow editing of name, address, and delivery cadence fields
3. WHEN an admin submits valid changes, THE Edit_Property_Modal SHALL save the changes and refresh the table
4. WHEN an admin cancels, THE Edit_Property_Modal SHALL close without saving changes
5. IF the update fails, THEN THE Edit_Property_Modal SHALL display an error message

### Requirement 4: Assign Florist Modal

**User Story:** As an admin, I want to assign a florist to a property, so that the property can receive floral deliveries.

#### Acceptance Criteria

1. WHEN an admin clicks "Assign Florist" with a property selected, THE Assign_Florist_Modal SHALL open showing available florists
2. THE Assign_Florist_Modal SHALL display florist name and status for each option
3. WHEN an admin selects a florist and confirms, THE Assign_Florist_Modal SHALL create the assignment and refresh the table
4. WHEN the assignment succeeds, THE Properties_Table SHALL show the updated florist name and recomputed status
5. IF the assignment fails, THEN THE Assign_Florist_Modal SHALL display an error message
6. WHEN an admin cancels, THE Assign_Florist_Modal SHALL close without making changes

### Requirement 5: Assign Property Manager Modal

**User Story:** As an admin, I want to assign a property manager to a property, so that the property has a designated manager.

#### Acceptance Criteria

1. WHEN an admin clicks "Assign PM" with a property selected, THE Assign_PM_Modal SHALL open showing users with PROPERTY_MANAGER role
2. THE Assign_PM_Modal SHALL display user email for each option
3. WHEN an admin selects a PM and confirms, THE Assign_PM_Modal SHALL assign the PM and refresh the table
4. WHEN the assignment succeeds, THE Properties_Table SHALL show the updated PM email and recomputed status
5. IF the assignment fails, THEN THE Assign_PM_Modal SHALL display an error message
6. WHEN an admin cancels, THE Assign_PM_Modal SHALL close without making changes

### Requirement 6: Visual Feedback

**User Story:** As an admin, I want clear visual feedback when a property is selected, so that I know which property my actions will affect.

#### Acceptance Criteria

1. WHILE a property is selected, THE Properties_Table SHALL highlight the selected row with a distinct background color
2. WHILE a property is selected, THE Action_Bar SHALL display the selected property's name
3. THE Selection_Column checkbox SHALL show a checked state for the selected property
