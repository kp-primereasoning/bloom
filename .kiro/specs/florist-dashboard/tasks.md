# Implementation Plan: Florist Dashboard

## Overview

This plan implements the Florist Dashboard feature, providing florists with visibility into their assigned properties and upcoming deliveries. The implementation follows a backend-first approach, creating API endpoints before building the frontend components.

## Tasks

- [x] 1. Create shared types for florist dashboard
  - Add FloristStatus, AssignedProperty, FloristMeResponse types to shared package
  - Add FloristDelivery, FloristDeliveriesListResponse types
  - Add UpdateDeliveryStatusRequest type
  - _Requirements: 1.1, 2.2, 3.1_

- [x] 2. Implement Florist Me endpoint
  - [x] 2.1 Create FloristMeResponse schema in `apps/api/schemas/domain.py`
    - Include florist_id, florist_name, florist_status, assigned_properties
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Implement `GET /florist/me` endpoint in `apps/api/routes/florist.py`
    - Query florist by user association
    - Join PropertyAssignment and Property tables for assigned properties
    - Return empty array when no assignments
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 2.3 Write property test for Florist Me response structure
    - **Property 2: Florist Me Response Structure**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 3. Implement Florist Deliveries List endpoint
  - [x] 3.1 Create FloristDeliveryResponse and FloristDeliveriesListResponse schemas
    - Include customer_email, property_name, property_address, subscription_plan, scheduled_for
    - _Requirements: 2.2_
  - [x] 3.2 Implement `GET /florist/deliveries` endpoint
    - Query deliveries with SCHEDULED status for assigned properties
    - Join User table for customer email
    - Join Property table for property details
    - Order by scheduled_for ascending
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 3.3 Write property test for deliveries filtering and ordering
    - **Property 3: Deliveries Filtered by Assignment and Status**
    - **Property 4: Deliveries Ordered by Date**
    - **Validates: Requirements 2.1, 2.3, 2.4**

- [x] 4. Implement Update Delivery Status endpoint
  - [x] 4.1 Create UpdateDeliveryStatusRequest schema
    - Accept only DELIVERED or MISSED status values
    - _Requirements: 3.1, 4.1_
  - [x] 4.2 Implement `PATCH /florist/deliveries/{delivery_id}` endpoint
    - Verify florist has active assignment to delivery's property
    - Validate current status is SCHEDULED
    - Update status and set delivered_at for DELIVERED
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_
  - [x] 4.3 Write property test for assignment-based authorization
    - **Property 6: Assignment-Based Authorization**
    - **Validates: Requirements 3.3, 3.4, 4.2, 4.3**
  - [x] 4.4 Write property test for status transitions
    - **Property 7: Delivery Status Update with Timestamp**
    - **Property 8: Valid Status Transitions**
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.4**

- [x] 5. Checkpoint - Backend API complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Add API client methods for florist endpoints
  - [x] 6.1 Add getFloristMe() method to `apps/web/src/lib/api.ts`
    - _Requirements: 1.5_
  - [x] 6.2 Add getFloristDeliveries() method
    - _Requirements: 2.6_
  - [x] 6.3 Add updateDeliveryStatus() method
    - _Requirements: 3.6_

- [x] 7. Implement Florist Deliveries Page
  - [x] 7.1 Replace placeholder with functional DeliveriesPage component
    - Fetch deliveries on mount using getFloristDeliveries()
    - Display table with columns: Delivery Date, Property, Customer, Plan, Actions
    - Show loading state while fetching
    - Show empty state when no deliveries
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 7.2 Implement Mark Delivered and Mark Missed action buttons
    - Call updateDeliveryStatus() on click
    - Show loading state on button during action
    - Remove delivery from list on success
    - Display error message on failure
    - _Requirements: 5.5, 6.1, 6.2, 6.3, 6.4_
  - [x] 7.3 Write unit tests for DeliveriesPage component
    - Test loading state renders
    - Test empty state renders
    - Test deliveries table renders correct columns
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implement Florist Settings Page
  - [x] 8.1 Replace placeholder with functional SettingsPage component
    - Fetch florist profile on mount using getFloristMe()
    - Display business name and status badge
    - Display list of assigned properties
    - Display Shopify integration placeholder
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 8.2 Write unit tests for SettingsPage component
    - Test florist info displays correctly
    - Test assigned properties list renders
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Implement Florist Availability Page
  - [x] 9.1 Replace placeholder with functional AvailabilityPage component
    - Display weekly delivery capacity (placeholder value for now)
    - Display delivery windows placeholder
    - _Requirements: 9.1, 9.4_

- [x] 10. Implement Florist Products Page
  - [x] 10.1 Replace placeholder with enhanced ProductsPage component
    - Display Shopify integration explanation
    - Display three subscription tiers with descriptions
    - Display "Coming soon" indicator
    - _Requirements: 10.1, 10.2, 10.3_

- [x] 11. Verify route protection
  - [x] 11.1 Write property test for FLORIST role enforcement on API
    - **Property 1: FLORIST Role Enforcement**
    - **Validates: Requirements 1.4, 2.5, 3.5**
  - [x] 11.2 Write unit test for route protection on frontend
    - **Property 9: Route Protection by Role**
    - **Validates: Requirements 8.1, 8.2**

- [x] 12. Final checkpoint - All tests pass
  - All 36 backend florist tests pass
  - All 29 frontend florist tests pass

- [x] 13. Update CHANGELOG.md
  - Add entry for Florist Dashboard feature

## Notes

- All tasks including tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Backend tasks (1-5) should be completed before frontend tasks (6-12)
