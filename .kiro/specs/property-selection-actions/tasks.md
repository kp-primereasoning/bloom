# Implementation Plan: Property Selection Actions

## Overview

This plan implements row selection and contextual actions for the admin Properties table. The implementation is frontend-heavy with one minor backend change.

## Tasks

- [x] 1. Update AdminTable component to support selection
  - [x] 1.1 Add selection props to AdminTable interface (selectable, selectedId, onSelect)
    - Add optional props for selection functionality
    - Maintain backward compatibility with existing usage
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 Implement checkbox column rendering when selectable is true
    - Add checkbox as first column when selectable prop is true
    - Handle checkbox click to call onSelect callback
    - Apply selected row highlighting with bg-indigo-50 class
    - _Requirements: 1.1, 1.2, 6.1, 6.3_
  - [x] 1.3 Write property test for single selection invariant
    - **Property 1: Single Selection Invariant**
    - **Validates: Requirements 1.2, 1.3, 1.4**

- [x] 2. Add role filter to backend users endpoint
  - [x] 2.1 Update GET /admin/users to accept optional role query parameter
    - Add role parameter to list_users function
    - Filter users by role when parameter provided
    - _Requirements: 5.1_

- [x] 3. Create AssignFloristModal component
  - [x] 3.1 Create AssignFloristModal.tsx with florist selection dropdown
    - Fetch florists from GET /admin/florists on mount
    - Display florist name and status in dropdown
    - Show current assignment if exists
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Implement florist assignment submission
    - Call POST /admin/property-assignments on confirm
    - Handle success (close modal, trigger refresh)
    - Handle errors (display in modal)
    - _Requirements: 4.3, 4.5, 4.6_

- [x] 4. Create AssignPMModal component
  - [x] 4.1 Create AssignPMModal.tsx with PM selection dropdown
    - Fetch users with role=PROPERTY_MANAGER from GET /admin/users?role=PROPERTY_MANAGER
    - Display user email in dropdown
    - Show current PM if assigned
    - _Requirements: 5.1, 5.2_
  - [x] 4.2 Implement PM assignment submission
    - Call PATCH /admin/properties/{id}/assign-pm on confirm
    - Handle success (close modal, trigger refresh)
    - Handle errors (display in modal)
    - _Requirements: 5.3, 5.5, 5.6_

- [x] 5. Create EditPropertyModal component
  - [x] 5.1 Create EditPropertyModal.tsx with pre-populated form
    - Accept property data as prop
    - Pre-fill name, address, delivery_cadence fields
    - Reuse field styling from AddModal
    - _Requirements: 3.1, 3.2_
  - [x] 5.2 Implement property update submission
    - Call PATCH /admin/properties/{id} on confirm
    - Handle success (close modal, trigger refresh)
    - Handle errors (display in modal)
    - _Requirements: 3.3, 3.4, 3.5_
  - [x] 5.3 Write property test for edit modal data integrity
    - **Property 4: Edit Modal Data Integrity**
    - **Validates: Requirements 3.1, 3.2**

- [x] 6. Update PropertiesPage with selection and action bar
  - [x] 6.1 Add selection state and modal state management
    - Add selectedPropertyId state (string | null)
    - Add modal open states for edit, assignFlorist, assignPM
    - Get selected property object from properties array
    - _Requirements: 1.2, 1.3, 1.4_
  - [x] 6.2 Implement dynamic action bar
    - Show "Add Property" when no selection
    - Show "Edit Property", "Assign Florist", "Assign PM" when property selected
    - Display selected property name in action bar
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2_
  - [x] 6.3 Wire up AdminTable with selection props
    - Pass selectable={true}, selectedId, onSelect to AdminTable
    - Handle selection changes
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 6.4 Integrate all modals with action buttons
    - Open EditPropertyModal on "Edit Property" click
    - Open AssignFloristModal on "Assign Florist" click
    - Open AssignPMModal on "Assign PM" click
    - Refresh table on successful modal actions
    - _Requirements: 3.1, 4.1, 5.1_
  - [x] 6.5 Write property test for action bar state consistency
    - **Property 2: Action Bar State Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 7. Checkpoint - Verify all functionality works
  - Ensure all tests pass, ask the user if questions arise.
  - Test full flow: select property → assign florist → verify status updates
  - Test full flow: select property → assign PM → verify status updates
  - Test full flow: select property → edit → verify changes saved

- [-] 8. Export new components and update CHANGELOG
  - [x] 8.1 Export new modal components from components/index.ts
    - Add exports for AssignFloristModal, AssignPMModal, EditPropertyModal
    - _Requirements: N/A (housekeeping)_
  - [ ] 8.2 Update CHANGELOG.md with feature summary
    - Add entry for property selection and assignment features
    - _Requirements: N/A (housekeeping)_

## Notes

- All tasks are required including property tests
- Each task references specific requirements for traceability
- The backend change (task 2) is minimal - just adding a query parameter filter
- Most complexity is in the frontend modal components
- Property tests validate selection state invariants and data integrity
