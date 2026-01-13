# Implementation Plan: Florist Onboarding Steps

## Overview

This plan implements the onboarding steps section for the florist Settings page. The implementation follows a component-first approach, building the UI components and then wiring them together with state management.

## Tasks

- [x] 1. Create StepCard component
  - [x] 1.1 Create StepCard component with step number, title, description display
    - Create `apps/web/src/components/StepCard.tsx`
    - Accept `step` prop with id, number, title, description, isComplete
    - Accept `onClick` and optional `disabled` props
    - Display empty circle when incomplete, checkmark when complete
    - Apply hover state styling for clickable indication
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.2 Write property test for StepCard indicator rendering
    - **Property 1: Step Card Indicator Matches Completion State**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 1.3 Write property test for StepCard content rendering
    - **Property 2: Step Card Contains Required Information**
    - **Validates: Requirements 2.3**

- [x] 2. Create modal components for each step
  - [x] 2.1 Create LinkStoreModal component
    - Create `apps/web/src/components/LinkStoreModal.tsx`
    - Display Shopify connection instructions
    - Include placeholder button for OAuth flow
    - Accept `isOpen`, `onClose`, `onComplete` props
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.2 Create LinkProductsModal component
    - Create `apps/web/src/components/LinkProductsModal.tsx`
    - Display product selection placeholder interface
    - Show prerequisite message if store not linked
    - Accept `isOpen`, `onClose`, `onComplete`, `storeLinked` props
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 2.3 Create TurnOnDeliveriesModal component
    - Create `apps/web/src/components/TurnOnDeliveriesModal.tsx`
    - Display toggle/confirmation to enable deliveries
    - Show prerequisite message if products not linked
    - Accept `isOpen`, `onClose`, `onComplete`, `productsLinked` props
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.4 Write property test for prerequisite validation
    - **Property 5: Prerequisite Steps Block Dependent Steps**
    - **Validates: Requirements 5.2, 6.2**

- [x] 3. Create OnboardingSteps container component
  - [x] 3.1 Create OnboardingSteps component with state management
    - Create `apps/web/src/components/OnboardingSteps.tsx`
    - Define step configuration array with id, number, title, description
    - Manage completion state with useState
    - Persist state to localStorage
    - Render three StepCard components in horizontal row
    - Display success state when all steps complete
    - _Requirements: 1.1, 1.2, 1.3, 6.4_

  - [x] 3.2 Wire modal opening logic
    - Track which modal is open with useState
    - Pass onClick handlers to StepCards
    - Render appropriate modal based on open state
    - Handle modal close and complete callbacks
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.3 Write property test for modal opening
    - **Property 3: Click Opens Corresponding Modal**
    - **Validates: Requirements 3.1**

  - [x] 3.4 Write property test for step completion state
    - **Property 4: Step Completion Updates State**
    - **Validates: Requirements 3.4, 4.3, 5.3, 6.3**

- [x] 4. Integrate into SettingsPage
  - [x] 4.1 Add OnboardingSteps to SettingsPage
    - Import OnboardingSteps component
    - Add at top of SettingsPage before existing content
    - Ensure responsive layout (horizontal on desktop, vertical on mobile)
    - _Requirements: 1.1, 1.3, 1.4_

  - [x] 4.2 Write unit tests for SettingsPage integration
    - Verify onboarding section renders at top
    - Verify three step cards display in correct order
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Export components and update index
  - [x] 6.1 Update component exports
    - Add StepCard, OnboardingSteps to `apps/web/src/components/index.ts`
    - Add modal components to exports
    - _Requirements: N/A (housekeeping)_

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Modal implementations are placeholders for future Shopify integration
- localStorage is used for state persistence in MLP phase
