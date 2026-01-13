# Implementation Plan: Customer Deliveries Page

## Overview

This plan implements the Customer Deliveries Page feature, providing customers with a card-first interface to view upcoming and past deliveries. The implementation follows a backend-first approach: data model → API → seed data → shared types → frontend.

## Tasks

- [x] 1. Create Delivery data model and migration
  - [x] 1.1 Create Delivery model with enums and fields
    - Create `apps/api/models/delivery.py` with SubscriptionPlan enum, DeliveryStatus enum, and Delivery ORM model
    - Include all fields: id, user_id, property_id, subscription_plan, status, scheduled_for, delivered_at, created_at, updated_at, archived_at
    - Follow existing model patterns from property.py
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Create Alembic migration for deliveries table
    - Create migration file in `apps/api/alembic/versions/`
    - Define enum types and deliveries table with proper constraints
    - Add foreign key to properties table
    - _Requirements: 1.4_

  - [x] 1.3 Export Delivery model from models/__init__.py
    - Add Delivery, SubscriptionPlan, DeliveryStatus exports
    - _Requirements: 1.1_

- [x] 2. Implement GET /me/deliveries API endpoint
  - [x] 2.1 Add Delivery schemas to domain.py
    - Add DeliveryResponse schema with all fields
    - Add MeDeliveriesResponse schema with next_delivery and history
    - _Requirements: 2.1_

  - [x] 2.2 Implement /me/deliveries endpoint in routes/me.py
    - Add GET /me/deliveries route with CUSTOMER role requirement
    - Query next scheduled delivery (future, not archived)
    - Query history (past, not archived, limit 20, descending order)
    - Return MeDeliveriesResponse
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Write property test for CUSTOMER-only access
    - **Property 1: CUSTOMER-only access**
    - **Validates: Requirements 2.4**

  - [x] 2.4 Write property test for archived delivery exclusion
    - **Property 2: Archived delivery exclusion**
    - **Validates: Requirements 2.3**

  - [x] 2.5 Write property test for history ordering
    - **Property 3: History ordering**
    - **Validates: Requirements 2.2**

- [x] 3. Checkpoint - Backend API complete
  - Ensure migration runs successfully
  - Ensure all backend tests pass
  - Ask the user if questions arise

- [x] 4. Seed delivery data for development
  - [x] 4.1 Add delivery seeding to seed.py
    - Seed 1 future SCHEDULED delivery for ACTIVE subscription customers
    - Seed 2-5 past deliveries with varied statuses for ACTIVE/PAUSED customers
    - Use deterministic UUIDs for idempotence
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 4.2 Write property test for seed idempotence
    - **Property 6: Seed idempotence**
    - **Validates: Requirements 3.3**

- [x] 5. Add shared types for deliveries
  - [x] 5.1 Add delivery types to packages/shared
    - Add SubscriptionPlan const object and type
    - Add DeliveryStatus const object and type
    - Add Delivery interface
    - Add MeDeliveriesResponse interface
    - Export from index.ts
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 5.2 Add getMyDeliveries to API client
    - Add getMyDeliveries() function to apps/web/src/lib/api.ts
    - Return Promise<MeDeliveriesResponse>
    - _Requirements: 5.1, 5.2_

- [x] 6. Implement DeliveriesPage frontend component
  - [x] 6.1 Create DeliveriesPage component structure
    - Create `apps/web/src/pages/customer/DeliveriesPage.tsx`
    - Set up state for userData, deliveries, loading, error
    - Fetch /auth/me and /me/deliveries on mount
    - Implement loading skeleton
    - _Requirements: 11.1_

  - [x] 6.2 Implement Header Card
    - Display title "Deliveries" and subtitle
    - Show subscription status chip (ACTIVE/PAUSED/NOT ACTIVE)
    - Use consistent card styling with borders and shadows
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.1_

  - [x] 6.3 Implement Next Delivery Card with table
    - Display scheduled date prominently or "Coming soon"
    - Render table with Property, Delivery window, Plan, Status columns
    - Show action button based on subscription_status (Resume/Activate/All set)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 6.4 Implement Delivery History Card with table
    - Render table with Date, Status, Plan, Notes, Details columns
    - Display empty state "No deliveries yet." when history is empty
    - Style status values appropriately
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 6.5 Implement Support Card
    - Display support text and Email support button
    - Add FAQ link (placeholder)
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 6.6 Implement error handling
    - Display inline error messages within cards
    - Parse Error_Envelope for user-friendly messages
    - _Requirements: 11.2, 11.3_

- [x] 7. Add route and navigation
  - [x] 7.1 Add /customer/deliveries route
    - Add route to router configuration
    - Ensure CUSTOMER-only access with redirect for other roles
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 7.2 Export DeliveriesPage from customer index
    - Add export to apps/web/src/pages/customer/index.ts
    - _Requirements: 6.1_

- [x] 8. Write frontend tests
  - [x] 8.1 Write unit tests for DeliveriesPage
    - Test page renders all 4 cards
    - Test loading skeleton displays
    - Test error state displays
    - Test empty history state
    - _Requirements: 7.1, 9.3, 11.1, 11.2_

- [x] 9. Final checkpoint - Feature complete
  - Ensure all tests pass (backend and frontend)
  - Verify page renders correctly with seed data
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive testing
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
