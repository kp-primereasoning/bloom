# Implementation Plan: Enhanced Properties Table

## Overview

This implementation enhances the Admin Properties table with user counts, florist/PM assignments, and automatic status computation. The work is organized backend-first, starting with database schema changes, then API enhancements, and finally frontend updates.

## Tasks

- [x] 1. Database Schema Updates
  - [x] 1.1 Update Property model with new status enum and property_manager_id
    - Update `PropertyStatus` enum to: CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE
    - Add `property_manager_id` foreign key column to Property model
    - Add relationship to User model for property_manager
    - _Requirements: 1.1, 5.1_

  - [x] 1.2 Update User model with property_id and subscription_status
    - Add `SubscriptionStatus` enum: CREATED, ACTIVE, PAUSED
    - Add `property_id` foreign key column to User model
    - Add `subscription_status` column with default CREATED
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 1.3 Create Alembic migration for schema changes
    - Create migration file for new columns and enum types
    - Handle migration of existing DRAFT/SUBMITTED/ACTIVE statuses to new enum
    - _Requirements: 1.1, 2.1, 3.1, 5.1_

- [x] 2. Backend Status Computation Logic
  - [x] 2.1 Implement status computation function in property_service
    - Create `compute_property_status(has_florist: bool, has_pm: bool) -> PropertyStatus`
    - Return CREATED, PENDING_FLORIST, PENDING_PM, or ACTIVE based on inputs
    - _Requirements: 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4_

  - [x] 2.2 Write property test for status computation
    - **Property 1: Status Computation Correctness**
    - **Validates: Requirements 1.3, 1.4, 1.5, 8.1, 8.2, 8.3, 8.4**

  - [x] 2.3 Implement status recomputation on assignment changes
    - Update `create_assignment` to recompute property status after florist assignment
    - Create helper to check if property has active florist assignment
    - _Requirements: 8.5_

- [x] 3. Enhanced Properties API
  - [x] 3.1 Create EnrichedPropertyResponse schema
    - Add fields: total_users, active_users, florist_name, property_manager_email
    - Update PropertyResponse to EnrichedPropertyResponse in admin routes
    - _Requirements: 6.1_

  - [x] 3.2 Implement get_enriched_properties service function
    - Query properties with user counts (total and active)
    - Join with florist via active assignment to get florist_name
    - Join with user via property_manager_id to get PM email
    - _Requirements: 3.2, 3.3, 4.1, 5.2, 6.2, 6.3, 6.4, 6.5_

  - [x] 3.3 Write property tests for enriched property fields
    - **Property 2: Total Users Count Accuracy**
    - **Property 3: Active Users Count Accuracy**
    - **Property 4: Florist Name Resolution**
    - **Property 5: Property Manager Email Resolution**
    - **Validates: Requirements 3.2, 3.3, 4.1, 5.2**

  - [x] 3.4 Update list_properties endpoint to return enriched data
    - Change response_model to List[EnrichedPropertyResponse]
    - Call get_enriched_properties instead of get_properties
    - _Requirements: 6.1_

- [x] 4. Property Manager Assignment Endpoint
  - [x] 4.1 Create AssignPMRequest schema
    - Add user_id field (UUID, required)
    - _Requirements: 7.2_

  - [x] 4.2 Implement assign_property_manager service function
    - Validate user exists and has PROPERTY_MANAGER role
    - Update property's property_manager_id
    - Recompute and update property status
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 4.3 Write property test for PM role validation
    - **Property 6: PM Role Validation**
    - **Validates: Requirements 7.3, 7.4**

  - [x] 4.4 Create PATCH /admin/properties/{id}/assign-pm endpoint
    - Accept AssignPMRequest body
    - Call assign_property_manager service
    - Return updated EnrichedPropertyResponse
    - _Requirements: 7.1_

- [x] 5. Checkpoint - Backend Complete
  - Ensure all backend tests pass
  - Verify API returns enriched property data
  - Ask the user if questions arise

- [x] 6. Frontend Type Updates
  - [x] 6.1 Update shared domain types
    - Update PropertyStatus enum with new values
    - Add SubscriptionStatus enum
    - Create EnrichedProperty interface with new fields
    - _Requirements: 1.1, 2.1, 6.1_

- [x] 7. Frontend Properties Page Enhancement
  - [x] 7.1 Add status label and color mappings
    - Create STATUS_LABELS mapping for human-readable labels
    - Create STATUS_COLORS mapping for badge styling
    - _Requirements: 1.6_

  - [x] 7.2 Update PropertiesPage columns configuration
    - Add Total Users column
    - Add Active Users column
    - Add Florist Assigned column (show "—" if null)
    - Add Property Manager column (show "—" if null)
    - Update Status column to use new labels and colors
    - _Requirements: 3.4, 4.2, 4.3, 5.3, 5.4, 1.6_

  - [x] 7.3 Update PropertiesPage to use EnrichedProperty type
    - Update state type from Property to EnrichedProperty
    - Remove status dropdown (status is now computed, not editable)
    - _Requirements: 6.1_

- [x] 8. Final Checkpoint
  - Ensure all tests pass
  - Verify Properties page displays all new columns correctly
  - Ask the user if questions arise

## Notes

- All property tests are required and use Hypothesis with minimum 100 iterations
- Database migration should handle existing data gracefully
- Status is now computed, not manually editable - remove status dropdown from UI
