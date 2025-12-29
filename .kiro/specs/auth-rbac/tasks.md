# Implementation Plan: Authentication + Server-Side RBAC

## Overview

This plan implements JWT-based authentication and server-enforced RBAC for the Bloom platform. Tasks are ordered to build foundational components first, then layer on protection and UI. Backend and frontend work in parallel where possible.

## Tasks

- [x] 1. Set up backend auth foundation
  - [x] 1.1 Create User model and role enum
    - Create `apps/api/models/user.py` with User, UserRole, UserResponse
    - UserRole enum: CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN
    - User fields: id (UUID), email, hashed_password, role, created_at
    - _Requirements: 9.1, 9.2_

  - [x] 1.2 Create AuthService for JWT and password handling
    - Create `apps/api/auth/service.py`
    - Implement `create_access_token()` with explicit UNIX timestamps for exp/iat
    - Include claims: sub, email, role, iss="bloom-api", aud="bloom-web"
    - Implement `verify_token()` with 60s clock skew leeway
    - Implement `hash_password()` and `verify_password()` using bcrypt
    - Read JWT_SECRET from environment variable
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 1.3 Write property test for JWT claims
    - **Property 1: JWT Contains Required Claims**
    - **Validates: Requirements 1.1, 2.2**

- [x] 2. Implement auth dependencies and error handling
  - [x] 2.1 Create auth dependencies
    - Create `apps/api/auth/dependencies.py`
    - Implement `get_current_user()` dependency using HTTPBearer
    - Implement `require_role(roles)` dependency factory
    - Return 401 for invalid/missing token, 403 for wrong role
    - _Requirements: 3.5, 3.6_

  - [x] 2.2 Create global exception handler
    - Create `apps/api/middleware/exceptions.py`
    - Implement `http_exception_handler` for consistent error envelope
    - Format: `{ "error": { "code", "message", "request_id" } }`
    - Register handler in main.py
    - _Requirements: 3.1.1, 3.1.2, 3.1.3_

  - [x] 2.3 Write property test for error response format
    - **Property 5: Error Response Format Consistency**
    - **Validates: Requirements 3.1.1, 3.1.2, 3.1.3**

- [x] 3. Implement auth routes
  - [x] 3.1 Create in-memory user store for MLP
    - Create `apps/api/db/users.py` with simple dict-based storage
    - Implement `get_user_by_email()`, `get_user_by_id()`, `get_user_by_role()`
    - _Requirements: 9.1_

  - [x] 3.2 Implement login endpoint
    - Create `apps/api/routes/auth.py`
    - POST /auth/login accepts email + password
    - Returns `{ access_token, token_type, user }` on success
    - Returns 401 with error envelope on failure
    - _Requirements: 1.1, 1.2_

  - [x] 3.3 Implement /auth/me endpoint
    - GET /auth/me returns current user from JWT
    - Uses `get_current_user` dependency
    - _Requirements: 1.3, 1.4_

  - [x] 3.4 Write property test for auth/me round-trip
    - **Property 2: Auth/Me Round-Trip Consistency**
    - **Validates: Requirements 1.3**

  - [x] 3.5 Write property test for invalid credentials
    - **Property 10: Invalid Credentials Return 401**
    - **Validates: Requirements 1.2**

- [x] 4. Implement RBAC-protected routes
  - [x] 4.1 Create protected route modules
    - Create `apps/api/routes/admin.py` with GET /admin/ping
    - Create `apps/api/routes/florist.py` with GET /florist/ping
    - Create `apps/api/routes/pm.py` with GET /pm/ping
    - Create `apps/api/routes/customer.py` with GET /customer/ping
    - Each uses `require_role([ROLE])` dependency
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Register routes in main.py
    - Include auth, admin, florist, pm, customer routers
    - Update CORS to allow Authorization header
    - Add WEB_DOMAIN env var support for production
    - _Requirements: 3.2.1, 3.2.2, 3.2.3, 3.2.4_

  - [x] 4.3 Write property test for RBAC enforcement
    - **Property 3: RBAC Role-Route Access Matrix**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

  - [x] 4.4 Write property test for unauthenticated rejection
    - **Property 4: Unauthenticated Request Rejection**
    - **Validates: Requirements 3.6, 1.4**

- [x] 5. Implement dev user seeding
  - [x] 5.1 Create dev seeding logic
    - Create `apps/api/db/seed.py`
    - Seed one user per role if ENVIRONMENT=development and no users exist
    - Users: admin@bloom.test, florist@bloom.test, pm@bloom.test, customer@bloom.test
    - Password: bloom123 for all
    - Call on startup in main.py (dev only)
    - _Requirements: 9.1.1, 9.1.2, 9.1.3_

  - [x] 5.2 Create dev role switch endpoint
    - POST /auth/dev/switch-role (dev only)
    - Accepts role, returns JWT for seeded user of that role
    - _Requirements: 8.2_

- [x] 6. Checkpoint - Backend complete
  - Ensure all backend tests pass
  - Verify login flow works with seeded users
  - Verify RBAC blocks cross-role access
  - Ask the user if questions arise

- [x] 7. Set up frontend auth foundation
  - [x] 7.1 Add auth types to shared package
    - Update `packages/shared/src/types/auth.ts`
    - Add User, AuthState, LoginCredentials, LoginResponse, AuthError interfaces
    - Export from index.ts
    - _Requirements: 4.2_

  - [x] 7.2 Create API client helper
    - Create `apps/web/src/lib/api.ts`
    - Use VITE_API_BASE_URL env var
    - Include Authorization header when token exists
    - _Requirements: 4.1_

  - [x] 7.3 Create AuthProvider context
    - Create `apps/web/src/providers/AuthProvider.tsx`
    - Implement login() returning User (fixes race condition)
    - Implement logout() clearing localStorage
    - Restore auth state on mount from localStorage
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 10.1, 10.2_

  - [x] 7.4 Write property test for auth persistence round-trip
    - **Property 8: Auth State Persistence Round-Trip**
    - **Validates: Requirements 10.1, 10.2**

  - [x] 7.5 Write property test for logout clears state
    - **Property 9: Logout Clears All Auth State**
    - **Validates: Requirements 4.4**

- [x] 8. Implement frontend route protection
  - [x] 8.1 Create ProtectedRoute component
    - Create `apps/web/src/router/ProtectedRoute.tsx`
    - Redirect unauthenticated to /login
    - Redirect wrong role to their landing page
    - Show loading spinner while checking auth
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.2 Create LoadingSpinner component
    - Create `apps/web/src/components/LoadingSpinner.tsx`
    - Simple centered spinner for auth loading state
    - _Requirements: 7.3_

  - [x] 8.3 Update router to use ProtectedRoute
    - Wrap all role-specific routes with ProtectedRoute
    - Pass allowedRoles prop based on route namespace
    - Add /login route (unprotected)
    - Add /unauthorized route
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.4 Write property test for route guard behavior
    - **Property 6: Frontend Route Guard Behavior**
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 9. Implement login and error pages
  - [x] 9.1 Create LoginPage component
    - Create `apps/web/src/pages/LoginPage.tsx`
    - Email and password inputs
    - Submit button with loading state
    - Error message display
    - Redirect to role landing page on success (using returned user)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 Create UnauthorizedPage component
    - Create `apps/web/src/pages/UnauthorizedPage.tsx`
    - Display 403 message
    - Link to return to authorized area
    - _Requirements: 7.1, 7.2_

  - [x] 9.3 Write property test for login flow
    - **Property 7: Login Flow Correctness**
    - **Validates: Requirements 6.3, 6.4, 1.2**

- [x] 10. Update dev role switcher
  - [x] 10.1 Refactor RoleSwitcher to use backend
    - Update `apps/web/src/components/RoleSwitcher.tsx`
    - Call /auth/dev/switch-role endpoint
    - Store returned JWT and reload page
    - Only render in development mode
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 11. Wire up AuthProvider
  - [x] 11.1 Add AuthProvider to app root
    - Update `apps/web/src/main.tsx` or App.tsx
    - Wrap RouterProvider with AuthProvider
    - _Requirements: 4.1_

  - [x] 11.2 Update Sidebar to use auth role
    - Update `apps/web/src/components/Sidebar.tsx`
    - Get role from useAuth() instead of useRole()
    - _Requirements: 5.4_

  - [x] 11.3 Update TopBar to show user info
    - Update `apps/web/src/components/TopBar.tsx`
    - Display current user email
    - Add logout button
    - _Requirements: 4.4_

- [x] 12. Add environment configuration
  - [x] 12.1 Create .env.example files
    - Backend: JWT_SECRET, ENVIRONMENT
    - Frontend: VITE_API_BASE_URL
    - Document in README
    - _Requirements: 2.1, 3.2.2, 3.2.3_

- [x] 13. Final checkpoint - Full integration
  - Ensure all tests pass (backend + frontend)
  - Test full login flow with each role
  - Verify RBAC blocks cross-role access even if frontend bypassed
  - Verify page refresh preserves auth state
  - Ask the user if questions arise

## Notes

- All property-based tests are required for comprehensive coverage
- Backend uses in-memory storage for MLP (no database yet)
- Dev seeding only runs in development environment
- CORS configured for localhost and production domain via env var
