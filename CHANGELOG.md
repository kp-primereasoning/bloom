# Bloom Development Changelog

This file tracks all features, components, and infrastructure built for the Bloom platform.

---

## Log

| Date | What Was Built | What It Does |
|------|----------------|--------------|
| 2025-12-29 | Admin Users Enhanced | Enhanced UsersPage with Property/Subscription columns, inline role/status dropdowns, PATCH /admin/users/{id} endpoint, PM-property assignment sync, and 8 property-based test files |
| 2025-12-29 | Property Selection & Actions | Single-select properties table with Edit Property, Assign Florist, and Assign PM modals; dynamic action bar toggles between Add/Edit modes |
| 2025-12-29 | Enhanced Properties Table | Admin properties table with Total Users, Active Users, Florist Assigned, Property Manager, and auto-computed status (Created, Pending - Needs Florist, Pending - Needs PM, Active) |
| 2025-12-29 | Property Status Computation | Automatic status based on florist and PM assignments with recomputation on changes |
| 2025-12-29 | User Subscription Status | Added CREATED/ACTIVE/PAUSED subscription status to User model |
| 2025-12-29 | Enriched Properties API | GET /admin/properties returns computed fields (total_users, active_users, florist_name, property_manager_email) |
| 2025-12-29 | PM Assignment Endpoint | PATCH /admin/properties/{id}/assign-pm for assigning property managers with role validation |
| 2025-12-29 | Property-Based Tests (Enhanced) | 3 new PBT test files for status computation, enriched properties, and PM role validation |
| 2025-12-29 | Local Dev Setup | Docker Compose for Postgres, .env.local configs, pnpm dev scripts (dev, dev:db, dev:api, dev:web, db:migrate, db:reset, seed) |
| 2025-12-29 | Developer Documentation | docs/dev.md with prerequisites, commands, troubleshooting, and promote-to-prod workflow |
| 2025-12-29 | Admin CRUD UI | Admin pages for Properties, Florists, Users with tables, add modals, and status updates |
| 2025-12-29 | User Management API | GET/POST /admin/users endpoints for listing and creating users with RBAC |
| 2025-12-29 | AdminTable Component | Reusable table component with loading, error states, and custom column rendering |
| 2025-12-29 | AddModal Component | Reusable modal for entity creation with configurable fields and validation |
| 2025-12-29 | StatusDropdown Component | Inline dropdown for updating entity status with loading state |
| 2025-12-28 | AWS Amplify Deployment | Deployed Bloom web app to AWS Amplify (https://main.d3f5f6vbe1hs1s.amplifyapp.com) with VITE_API_BASE_URL env var |
| 2025-12-28 | Amplify Deployment Config | amplify.yml, pnpm-workspace.yaml, root package.json for monorepo Amplify deployment |
| 2025-12-28 | CORS Multi-Origin Support | Updated backend to support CORS_ORIGINS env var for multiple allowed origins |
| 2025-12-28 | App Runner Service Live | Created bloom-api App Runner service with VPC connector for RDS connectivity |
| 2025-12-28 | App Runner Deployment | Dockerfile, ECR repo (bloom-api), VPC connector, IAM roles for AWS App Runner deployment |
| 2025-12-28 | RDS Migrations Deployed | Ran Alembic migrations against AWS RDS PostgreSQL, created properties/florists/property_assignments tables |
| 2025-12-28 | Core Data Model | Property, Florist, PropertyAssignment ORM models with status enums and business rules |
| 2025-12-28 | Alembic Migrations | Database migration system with initial schema for core tables and pgcrypto extension |
| 2025-12-28 | Admin CRUD Endpoints | POST/GET /admin/properties, /admin/florists, /admin/property-assignments with RBAC |
| 2025-12-28 | Domain Services | Service layer with status transition validation and single-active-assignment logic |
| 2025-12-28 | Shared Domain Types | TypeScript types for Property, Florist, PropertyAssignment exported from shared package |
| 2025-12-28 | RDS PostgreSQL (dev) | AWS RDS PostgreSQL 15 instance (bloom-dev) with Secrets Manager password |
| 2025-12-28 | Property Tests (Data Model) | 8 property-based tests for entity defaults, timestamps, status transitions, referential integrity |
| 2025-12-28 | Monorepo Structure | Created `/apps/web`, `/apps/api`, `/packages/shared`, `/docs`, `/infra` directories |
| 2025-12-28 | Shared Types Package | TypeScript package with UserRole enum and navigation types |
| 2025-12-28 | FastAPI Backend Skeleton | Minimal API with `/health` endpoint and CORS for localhost |
| 2025-12-28 | Vite React Frontend | React + TypeScript + Tailwind app with ESLint, Prettier, Vitest |
| 2025-12-28 | Dashboard Layout | Shared shell with sidebar, top bar, and content area |
| 2025-12-28 | Role Switcher | Dev tool dropdown to switch between 4 user roles with localStorage persistence |
| 2025-12-28 | Sidebar Configuration | Role-based navigation config for Customer, PM, Florist, Admin |
| 2025-12-28 | Placeholder Pages | 16 placeholder pages across all 4 role namespaces |
| 2025-12-28 | Role-Gated Routing | Route protection with namespace validation and redirect to role landing pages |
| 2025-12-28 | Property-Based Tests | 5 PBT test suites validating sidebar config, role persistence, namespaces, redirects |
| 2025-12-28 | JWT Authentication | Backend auth with bcrypt passwords, JWT tokens (exp/iat UNIX timestamps), role claims |
| 2025-12-28 | RBAC Dependencies | FastAPI `get_current_user()` and `require_role()` dependencies for route protection |
| 2025-12-28 | Auth Endpoints | POST /auth/login, GET /auth/me, POST /auth/dev/switch-role (dev only) |
| 2025-12-28 | Protected Route Namespaces | /admin, /florist, /pm, /customer ping endpoints with role guards |
| 2025-12-28 | Global Error Handler | Consistent error envelope format `{ error: { code, message, request_id } }` |
| 2025-12-28 | Dev User Seeding | Auto-seeds 4 test users (admin/florist/pm/customer @bloom.test) in dev mode |
| 2025-12-28 | AuthProvider Context | React context with login/logout, localStorage persistence, auth state restoration |
| 2025-12-28 | ProtectedRoute Component | Route guard with role validation, redirects for unauthenticated/unauthorized |
| 2025-12-28 | Login Page | Email/password form with error handling, redirects to role landing page |
| 2025-12-28 | Unauthorized Page | 403 page with link back to authorized area |
| 2025-12-28 | Auth Property Tests | 10 property-based tests covering JWT claims, RBAC, auth flow, persistence |
