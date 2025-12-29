# Implementation Plan: Repo Scaffold + Dashboard Shell

## Overview

This plan implements the Bloom monorepo scaffold with a role-based dashboard shell. Tasks are ordered to build incrementally: shared types first, then backend skeleton, then frontend with routing and layout.

## Tasks

- [x] 1. Set up monorepo structure and shared package
  - [x] 1.1 Create directory structure (`/apps/web`, `/apps/api`, `/packages/shared`, `/docs`, `/infra`)
    - Create all required directories with placeholder files
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Initialize shared TypeScript package with UserRole enum
    - Create `package.json` for shared package
    - Create `types/roles.ts` with UserRole enum
    - Create `types/navigation.ts` with NavItem and RoleConfig interfaces
    - Create `index.ts` to export all types
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 2. Set up FastAPI backend skeleton
  - [x] 2.1 Initialize FastAPI project with health endpoint
    - Create `main.py` with FastAPI app
    - Add `/health` endpoint returning `{"status": "healthy"}`
    - Configure CORS middleware for localhost:5173
    - Create `requirements.txt` with dependencies
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 2.2 Add Python linting configuration
    - Create `pyproject.toml` with ruff configuration
    - _Requirements: 9.4_

- [x] 3. Checkpoint - Verify backend runs
  - Ensure API starts and `/health` returns 200
  - Ask user if questions arise

- [x] 4. Initialize Vite React frontend
  - [x] 4.1 Create Vite + React + TypeScript project
    - Initialize with `pnpm create vite`
    - Configure TypeScript and Tailwind CSS
    - Set up path aliases for shared package import
    - _Requirements: 2.4, 8.2_
  - [x] 4.2 Add frontend tooling configuration
    - Create ESLint configuration
    - Create Prettier configuration
    - Add `typecheck` script to package.json
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 5. Implement sidebar configuration
  - [x] 5.1 Create sidebar config with role-based navigation
    - Create `config/sidebarConfig.ts` with nav items for all 4 roles
    - Define namespaces and default paths per role
    - Import UserRole from shared package
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 5.2 Write property test for sidebar configuration
    - **Property 1: Sidebar Configuration Correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 6. Implement dashboard layout components
  - [x] 6.1 Create DashboardLayout component
    - Implement left sidebar with navigation
    - Implement top bar with app name placeholder
    - Implement main content area with padding and max-width
    - Apply Tailwind CSS styling
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 6.2 Create Sidebar component
    - Render nav items from sidebarConfig based on current role
    - Highlight active route
    - Handle navigation on click
    - _Requirements: 3.5_
  - [x] 6.3 Create RoleSwitcher component
    - Render dropdown in top bar with all 4 role options
    - Store selected role in localStorage
    - Restore role from localStorage on load
    - Default to CUSTOMER if no stored role
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 6.4 Write property test for role persistence
    - **Property 3: Role Persistence Round-Trip**
    - **Validates: Requirements 5.3, 5.4**

- [x] 7. Checkpoint - Verify layout renders
  - Ensure dashboard layout displays correctly
  - Ensure role switcher changes sidebar nav
  - Ask user if questions arise

- [x] 8. Implement placeholder pages
  - [x] 8.1 Create placeholder page component
    - Create reusable `PlaceholderPage` component
    - Display page title and "coming soon" description
    - _Requirements: 4.2, 4.3_
  - [x] 8.2 Create all Customer role pages
    - Home, My Subscription, Deliveries, Account
    - _Requirements: 4.1_
  - [x] 8.3 Create all Property Manager role pages
    - Overview, Participation, Rewards, Settings
    - _Requirements: 4.1_
  - [x] 8.4 Create all Florist role pages
    - Upcoming Deliveries, Product Mapping, Availability, Settings
    - _Requirements: 4.1_
  - [x] 8.5 Create all Admin role pages
    - Properties, Florists, Assignments, Exceptions
    - _Requirements: 4.1_
  - [x] 8.6 Write property test for placeholder pages
    - **Property 2: Placeholder Page Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 9. Implement role-gated routing
  - [x] 9.1 Set up React Router with role namespaces
    - Configure routes for all 4 role namespaces
    - Set up nested routes within each namespace
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 9.2 Implement route protection and redirects
    - Create route guard that checks current role
    - Redirect unauthorized routes to role's default landing page
    - Handle root path redirect based on current role
    - _Requirements: 6.5, 6.6, 6.7, 6.8, 6.9_
  - [x] 9.3 Write property test for route namespace
    - **Property 4: Route Namespace Consistency**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [x] 9.4 Write property test for unauthorized redirects
    - **Property 5: Unauthorized Route Redirect**
    - **Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9**

- [x] 10. Create root README and finalize
  - [x] 10.1 Write root README with run instructions
    - Document how to run web app (`pnpm dev`)
    - Document how to run API (`uvicorn main:app`)
    - Include environment variable placeholders
    - _Requirements: 9.5, 9.6, 9.7, 1.6_

- [x] 11. Final checkpoint - Full integration test
  - Verify `pnpm dev` runs web app
  - Verify sidebar nav changes based on role
  - Verify each role has landing page and route namespace
  - Verify unauthorized route redirects work
  - Verify API `/health` responds
  - Ask user if questions arise

## Notes

- All property-based tests are required for comprehensive coverage
- Backend uses FastAPI (Python) per steering rules
- Frontend uses pnpm as package manager
- Shared package uses TypeScript for type safety across apps
