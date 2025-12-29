# Requirements Document

## Introduction

This document defines the requirements for setting up the Bloom monorepo with a working frontend and backend skeleton, including a shared dashboard shell UI that supports four user roles (Customer, Property Manager, Florist, Admin) with role-gated routes and role-specific sidebar navigation.

## Glossary

- **Dashboard_Shell**: A shared UI layout component consisting of a sidebar, top bar, and main content area used across all user roles
- **Role_Switcher**: A temporary development tool allowing developers to switch between user roles without authentication
- **Sidebar_Config**: A configuration object that defines navigation items based on the current user role
- **Role_Namespace**: A URL path prefix specific to each role (e.g., /customer, /pm, /florist, /admin)
- **Landing_Page**: The default page a user is redirected to when accessing the application for their role
- **Web_App**: The Vite + React + TypeScript frontend application
- **API_Service**: The FastAPI backend service
- **Shared_Package**: A TypeScript package containing shared types, enums, and validation logic

## Requirements

### Requirement 1: Monorepo Structure

**User Story:** As a developer, I want a well-organized monorepo structure, so that I can easily navigate and maintain the codebase across frontend, backend, and shared packages.

#### Acceptance Criteria

1. THE Monorepo SHALL contain an `/apps/web` directory for the Vite React application
2. THE Monorepo SHALL contain an `/apps/api` directory for the FastAPI backend service
3. THE Monorepo SHALL contain a `/packages/shared` directory for shared TypeScript types and validation
4. THE Monorepo SHALL contain a `/docs` directory for documentation placeholders
5. THE Monorepo SHALL contain an `/infra` directory for infrastructure placeholders
6. THE Monorepo SHALL contain a root README with run instructions for web and API

### Requirement 2: Dashboard Layout Component

**User Story:** As a user of any role, I want a consistent dashboard layout, so that I have a familiar and intuitive interface regardless of my role.

#### Acceptance Criteria

1. THE Dashboard_Shell SHALL display a left sidebar for navigation
2. THE Dashboard_Shell SHALL display a top bar containing the application name and user menu
3. THE Dashboard_Shell SHALL display a main content area with appropriate padding and max-width constraints
4. WHEN the Dashboard_Shell renders, THE Web_App SHALL apply consistent styling using Tailwind CSS

### Requirement 3: Role-Based Sidebar Navigation

**User Story:** As a user, I want to see navigation items relevant to my role, so that I can access only the features available to me.

#### Acceptance Criteria

1. WHEN the current role is CUSTOMER, THE Sidebar_Config SHALL display: Home, My Subscription, Deliveries, Account
2. WHEN the current role is PROPERTY_MANAGER, THE Sidebar_Config SHALL display: Overview, Participation, Rewards, Settings
3. WHEN the current role is FLORIST, THE Sidebar_Config SHALL display: Upcoming Deliveries, Product Mapping, Availability, Settings
4. WHEN the current role is ADMIN, THE Sidebar_Config SHALL display: Properties, Florists, Assignments, Exceptions
5. WHEN a navigation item is clicked, THE Web_App SHALL navigate to the corresponding route

### Requirement 4: Placeholder Pages

**User Story:** As a developer, I want placeholder pages for each route, so that I can verify routing works correctly before implementing business logic.

#### Acceptance Criteria

1. FOR EACH navigation item, THE Web_App SHALL render a placeholder page
2. WHEN a placeholder page renders, THE Web_App SHALL display the page title
3. WHEN a placeholder page renders, THE Web_App SHALL display a "coming soon" description

### Requirement 5: Development Role Switcher

**User Story:** As a developer, I want to switch between roles without authentication, so that I can test role-specific features during development.

#### Acceptance Criteria

1. THE Role_Switcher SHALL appear in the top bar as a dropdown
2. THE Role_Switcher SHALL provide options for: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN
3. WHEN a role is selected, THE Role_Switcher SHALL store the selection in localStorage
4. WHEN the Web_App loads, THE Role_Switcher SHALL restore the previously selected role from localStorage
5. IF no role is stored in localStorage, THEN THE Role_Switcher SHALL default to CUSTOMER

### Requirement 6: Role-Gated Routing

**User Story:** As a user, I want to be redirected to my role's landing page if I try to access unauthorized routes, so that I always see relevant content.

#### Acceptance Criteria

1. WHEN a CUSTOMER accesses the application, THE Web_App SHALL use the `/customer` namespace for routes
2. WHEN a PROPERTY_MANAGER accesses the application, THE Web_App SHALL use the `/pm` namespace for routes
3. WHEN a FLORIST accesses the application, THE Web_App SHALL use the `/florist` namespace for routes
4. WHEN an ADMIN accesses the application, THE Web_App SHALL use the `/admin` namespace for routes
5. WHEN a user attempts to access a route outside their role namespace, THE Web_App SHALL redirect to their role's default landing page
6. THE Web_App SHALL redirect CUSTOMER to `/customer/home` as the default landing page
7. THE Web_App SHALL redirect PROPERTY_MANAGER to `/pm/overview` as the default landing page
8. THE Web_App SHALL redirect FLORIST to `/florist/deliveries` as the default landing page
9. THE Web_App SHALL redirect ADMIN to `/admin/properties` as the default landing page

### Requirement 7: Backend API Skeleton

**User Story:** As a developer, I want a minimal backend API, so that I have a foundation for adding business logic later.

#### Acceptance Criteria

1. THE API_Service SHALL expose a `/health` endpoint that returns a success response
2. THE API_Service SHALL enable CORS for localhost development
3. WHEN a GET request is made to `/health`, THE API_Service SHALL return HTTP 200 with a JSON response

### Requirement 8: Shared Types Package

**User Story:** As a developer, I want shared type definitions, so that I can maintain consistency between frontend and backend.

#### Acceptance Criteria

1. THE Shared_Package SHALL export a `UserRole` enum with values: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN
2. THE Shared_Package SHALL be importable by the Web_App
3. THE Shared_Package SHALL use TypeScript for type definitions

### Requirement 9: Developer Experience

**User Story:** As a developer, I want proper tooling configured, so that I can maintain code quality and consistency.

#### Acceptance Criteria

1. THE Web_App SHALL include ESLint configuration for linting
2. THE Web_App SHALL include Prettier configuration for formatting
3. THE Web_App SHALL include a typecheck script for TypeScript validation
4. THE API_Service SHALL include formatting/linting configuration using ruff or black
5. THE root README SHALL document how to run the web application
6. THE root README SHALL document how to run the API service
7. THE root README SHALL include environment variable placeholders
