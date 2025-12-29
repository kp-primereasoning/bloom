# Requirements Document

## Introduction

This document defines the requirements for implementing real authentication and server-enforced role-based access control (RBAC) for the Bloom platform. The system will protect API routes and frontend pages by role, replacing the current UI-only role state with server-validated authentication. This prepares the system for multi-tenant data isolation.

## Glossary

- **Auth_System**: The authentication subsystem responsible for user login, JWT issuance, and session management
- **RBAC_Guard**: The middleware component that enforces role-based access control on API routes
- **JWT**: JSON Web Token containing user identity and role claims
- **Auth_Provider**: The React context provider managing authentication state on the frontend
- **Route_Guard**: The frontend component that protects routes based on authenticated user role
- **Role**: One of four user types: CUSTOMER, PROPERTY_MANAGER, FLORIST, or ADMIN
- **User**: An authenticated entity with an email, password, and assigned role
- **Error_Response**: Standardized JSON error format with code, message, and request_id fields

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to log in with my email and password, so that I can access my role-specific dashboard.

#### Acceptance Criteria

1. WHEN a user submits valid email and password credentials, THE Auth_System SHALL return a signed JWT containing the user's id, email, and role
2. WHEN a user submits invalid credentials, THE Auth_System SHALL return a 401 Unauthorized response with an error message
3. WHEN a user requests their profile via GET /auth/me with a valid JWT, THE Auth_System SHALL return the authenticated user's id, email, and role
4. WHEN a user requests their profile without a valid JWT, THE Auth_System SHALL return a 401 Unauthorized response

### Requirement 2: JWT Token Management

**User Story:** As a developer, I want JWTs to contain standardized claims, so that the backend can enforce role-based access without additional database lookups.

#### Acceptance Criteria

1. THE Auth_System SHALL sign JWTs using a secret key read from the JWT_SECRET environment variable
2. THE Auth_System SHALL include the following claims in the JWT payload: user id (sub), email, role, iss ("bloom-api"), aud ("bloom-web"), and exp (expiration)
3. WHEN a JWT is expired or malformed, THE Auth_System SHALL reject the request with a 401 Unauthorized response
4. THE Auth_System SHALL extract user information from the Authorization header Bearer token
5. THE Auth_System SHALL allow up to 60 seconds of clock skew when validating JWT expiration

### Requirement 3: Backend Role-Based Access Control

**User Story:** As a system administrator, I want API routes protected by role, so that users cannot access data outside their authorization scope.

#### Acceptance Criteria

1. THE RBAC_Guard SHALL restrict /admin/** routes to users with ADMIN role only
2. THE RBAC_Guard SHALL restrict /florist/** routes to users with FLORIST role only
3. THE RBAC_Guard SHALL restrict /pm/** routes to users with PROPERTY_MANAGER role only
4. THE RBAC_Guard SHALL restrict /customer/** routes to users with CUSTOMER role only
5. WHEN an authenticated user accesses a route outside their role scope, THE RBAC_Guard SHALL return a 403 Forbidden response
6. WHEN an unauthenticated user accesses any protected route, THE RBAC_Guard SHALL return a 401 Unauthorized response

### Requirement 3.1: Error Response Format

**User Story:** As a frontend developer, I want standardized error responses, so that I can handle auth errors consistently.

#### Acceptance Criteria

1. WHEN a 401 Unauthorized error occurs, THE Auth_System SHALL return an Error_Response with code, message, and request_id fields
2. WHEN a 403 Forbidden error occurs, THE RBAC_Guard SHALL return an Error_Response with code, message, and request_id fields
3. THE Error_Response SHALL follow the format: { "error": { "code": "<ERROR_CODE>", "message": "<human readable message>", "request_id": "<uuid>" } }

### Requirement 3.2: CORS Configuration

**User Story:** As a frontend developer, I want proper CORS configuration, so that the web app can communicate with the API.

#### Acceptance Criteria

1. THE Auth_System SHALL configure CORS to allow the Authorization header
2. THE Auth_System SHALL configure CORS to allow localhost origins in development mode
3. THE Auth_System SHALL configure CORS to allow the production web domain
4. THE Auth_System SHALL configure CORS with credentials=false for MLP

### Requirement 4: Frontend Authentication Context

**User Story:** As a frontend developer, I want a centralized auth context, so that components can access the current user and role consistently.

#### Acceptance Criteria

1. WHEN the application loads, THE Auth_Provider SHALL attempt to restore authentication state from stored JWT
2. WHEN authentication state changes, THE Auth_Provider SHALL expose the current user object including role
3. THE Auth_Provider SHALL provide login and logout functions to child components
4. WHEN a user logs out, THE Auth_Provider SHALL clear stored credentials and reset auth state

### Requirement 5: Frontend Route Protection

**User Story:** As a user, I want to be redirected appropriately based on my authentication status and role, so that I only see pages I'm authorized to access.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access a protected route, THE Route_Guard SHALL redirect to the login page
2. WHEN an authenticated user attempts to access a route outside their role scope, THE Route_Guard SHALL redirect to their role's landing page
3. WHEN an authenticated user accesses their role's routes, THE Route_Guard SHALL render the requested page
4. THE Route_Guard SHALL use the authenticated role from Auth_Provider, not local UI state

### Requirement 6: Login Page

**User Story:** As a user, I want a login page where I can enter my credentials, so that I can authenticate and access my dashboard.

#### Acceptance Criteria

1. THE Login_Page SHALL display email and password input fields
2. THE Login_Page SHALL display a submit button to initiate login
3. WHEN login fails, THE Login_Page SHALL display an error message to the user
4. WHEN login succeeds, THE Login_Page SHALL redirect the user to their role's landing page

### Requirement 7: Error Pages

**User Story:** As a user, I want clear feedback when I'm unauthorized, so that I understand why I cannot access certain pages.

#### Acceptance Criteria

1. THE System SHALL display a 403 Unauthorized page when a user attempts to access a forbidden resource
2. THE Unauthorized_Page SHALL provide a link to return to the user's authorized area
3. WHILE authentication is being verified, THE System SHALL display a loading state

### Requirement 8: Dev Role Switcher Compatibility

**User Story:** As a developer, I want to test different roles during development, so that I can verify role-based behavior without creating multiple accounts.

#### Acceptance Criteria

1. WHILE in development mode, THE Dev_Role_Switcher SHALL remain available
2. WHEN a developer switches roles via Dev_Role_Switcher, THE System SHALL issue a new JWT for the selected role via the backend
3. THE Dev_Role_Switcher SHALL NOT bypass server-side RBAC checks

### Requirement 9: User Data Model

**User Story:** As a developer, I want a user model with role information, so that the system can identify and authorize users.

#### Acceptance Criteria

1. THE User model SHALL include id, email, role, and created_at fields
2. THE User model SHALL enforce role as an enum of CUSTOMER, PROPERTY_MANAGER, FLORIST, or ADMIN
3. THE System SHALL support seeding test users for local development

### Requirement 9.1: Dev User Seeding

**User Story:** As a developer, I want test users automatically seeded in development, so that I can test all roles without manual setup.

#### Acceptance Criteria

1. WHILE in development mode, THE Auth_System SHALL seed one user per role on backend startup if no users exist
2. THE Auth_System SHALL NOT run user seeding in production mode
3. THE seeded users SHALL have predictable credentials for testing (e.g., admin@bloom.test, florist@bloom.test, pm@bloom.test, customer@bloom.test)

### Requirement 10: Auth State Persistence

**User Story:** As a user, I want my login to persist across page refreshes, so that I don't have to log in repeatedly.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE Auth_System SHALL store the JWT in browser localStorage
2. WHEN the page is refreshed, THE Auth_Provider SHALL restore auth state from localStorage
3. WHEN the stored JWT is invalid or expired, THE Auth_Provider SHALL clear localStorage and redirect to login

> **MLP Note:** localStorage is used for MLP simplicity. This may migrate to httpOnly cookies in a future iteration for enhanced security.
