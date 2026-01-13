# Implementation Plan: Customer Help/FAQ Page

## Overview

This plan implements a read-only Help page with FAQ accordion for Bloom customers. The implementation follows a backend-first approach: create the static config, add the public endpoint, then build the frontend components.

## Tasks

- [x] 1. Create shared FAQ types
  - [x] 1.1 Add FAQItem and FAQResponse interfaces to shared types
    - Create `packages/shared/src/types/faq.ts`
    - Export from `packages/shared/src/index.ts`
    - _Requirements: 6.1, 6.2_

- [x] 2. Implement backend FAQ endpoint
  - [x] 2.1 Create static FAQ configuration file
    - Create `apps/api/config/faq.json` with initial FAQ content
    - Include 5 starter FAQs with one mailto support link
    - _Requirements: 1.1, 1.3, 2.5_
  - [x] 2.2 Create public FAQ router
    - Create `apps/api/routes/public.py` with GET /faq endpoint
    - Load and return faq.json content
    - No authentication required
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 2.3 Register public router in main.py
    - Import and include public router
    - _Requirements: 2.1_
  - [x] 2.4 Write property test for FAQ JSON validation
    - **Property 1: FAQ JSON Round-Trip**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.2**

- [x] 3. Checkpoint - Backend verification
  - Ensure backend tests pass
  - Verify GET /public/faq returns expected JSON
  - Ask user if questions arise

- [x] 4. Implement frontend API client
  - [x] 4.1 Add getFAQ function to API client
    - Add `getFAQ(): Promise<FAQResponse>` to `apps/web/src/lib/api.ts`
    - Call GET /public/faq endpoint
    - _Requirements: 6.3_

- [x] 5. Implement frontend components
  - [x] 5.1 Create FAQAccordion component
    - Create `apps/web/src/components/FAQAccordion.tsx`
    - Implement single-item expansion behavior
    - Add smooth CSS transitions for expand/collapse
    - Render markdown with link support
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1_
  - [x] 5.2 Write property test for single-item expansion
    - **Property 2: Single-Item Expansion Invariant**
    - **Validates: Requirements 4.3**
  - [x] 5.3 Create HelpPage component
    - Create `apps/web/src/pages/customer/HelpPage.tsx`
    - Display "Help" title and "Frequently asked questions" subtitle
    - Fetch and display FAQs using FAQAccordion
    - _Requirements: 3.4, 3.5, 4.1_
  - [x] 5.4 Export HelpPage from customer pages index
    - Update `apps/web/src/pages/customer/index.ts`
    - _Requirements: 3.1_

- [x] 6. Add route and navigation
  - [x] 6.1 Add /customer/help route
    - Update `apps/web/src/router/index.tsx`
    - Wrap with ProtectedRoute for CUSTOMER role
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 6.2 Write property test for non-customer redirect
    - **Property 3: Non-Customer Role Redirect**
    - **Validates: Requirements 3.3**
  - [x] 6.3 Add Help link to customer sidebar
    - Update `apps/web/src/config/sidebarConfig.ts`
    - Add Help menu item for customer role
    - _Requirements: 3.1_

- [x] 7. Checkpoint - Frontend verification
  - Ensure all frontend tests pass
  - Verify page renders correctly for customer role
  - Verify accordion expand/collapse works
  - Verify mailto link opens email client
  - Ask user if questions arise

- [x] 8. Write property test for markdown rendering
  - **Property 4: Markdown Link Rendering**
  - **Validates: Requirements 4.5, 5.1**

- [x] 9. Final checkpoint
  - Ensure all tests pass
  - Verify end-to-end flow works locally
  - Update CHANGELOG.md
  - Ask user if questions arise

## Notes

- All property-based tests are required for comprehensive coverage
- Backend uses Python/FastAPI with Hypothesis for property tests
- Frontend uses React/TypeScript with fast-check for property tests
- Markdown rendering uses a lightweight library (react-markdown or similar)
- No database tables needed - FAQ content is static JSON
