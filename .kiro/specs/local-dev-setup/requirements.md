# Requirements Document

## Introduction

This feature establishes a streamlined local development environment for the Bloom platform, enabling developers to run the full stack (Postgres, API, Web) locally with minimal setup. It also documents the production deployment workflow to ensure seamless promotion from local development to production.

## Glossary

- **Local_Dev_Environment**: The complete local development stack including database, API server, and web frontend
- **Docker_Compose**: Container orchestration tool for running local services
- **Alembic**: Database migration tool for the Python/FastAPI backend
- **Dev_Scripts**: Root-level commands for managing local development workflows
- **Promote_Workflow**: The process of deploying local changes to production via Git

## Requirements

### Requirement 1: Local PostgreSQL Database

**User Story:** As a developer, I want to run PostgreSQL locally via Docker, so that I can develop and test without needing a remote database connection.

#### Acceptance Criteria

1. WHEN a developer runs the database start command, THE Docker_Compose SHALL start a PostgreSQL 15 container with database name "bloom", user "bloom", and password "bloom"
2. WHEN the PostgreSQL container starts, THE Docker_Compose SHALL expose port 5432 on localhost
3. WHEN the PostgreSQL container is stopped and restarted, THE Docker_Compose SHALL persist data using a named volume
4. WHEN a developer needs isolated test data, THE Docker_Compose SHALL provide a secondary database "bloom_test" for testing purposes

### Requirement 2: API Local Development

**User Story:** As a developer, I want to run the FastAPI server locally against the local Postgres, so that I can develop and debug API changes quickly.

#### Acceptance Criteria

1. WHEN a developer runs the API start command, THE Local_Dev_Environment SHALL read DATABASE_URL from apps/api/.env.local
2. WHEN the API server starts locally, THE Local_Dev_Environment SHALL configure CORS to allow requests from http://localhost:5173
3. WHEN a developer runs the bootstrap command, THE Local_Dev_Environment SHALL automatically run Alembic migrations to ensure the database schema is current
4. WHEN the API server is running, THE Local_Dev_Environment SHALL enable hot-reload for code changes

### Requirement 3: Web Local Development

**User Story:** As a developer, I want to run the web frontend locally pointing at the local API, so that I can develop UI features with full backend integration.

#### Acceptance Criteria

1. WHEN a developer runs the web start command, THE Local_Dev_Environment SHALL read VITE_API_BASE_URL from apps/web/.env.local
2. WHEN the web app is configured for local development, THE Local_Dev_Environment SHALL set VITE_API_BASE_URL to http://localhost:8000
3. WHEN a developer logs in locally, THE Local_Dev_Environment SHALL support the full auth flow (login → JWT → protected API calls)

### Requirement 4: Unified Dev Scripts

**User Story:** As a developer, I want simple root-level commands to manage all local services, so that I can start, stop, and reset the development environment efficiently.

#### Acceptance Criteria

1. WHEN a developer runs `pnpm dev`, THE Dev_Scripts SHALL start the database, API, and web services concurrently
2. WHEN a developer runs `pnpm dev:db`, THE Dev_Scripts SHALL start only the PostgreSQL container
3. WHEN a developer runs `pnpm dev:api`, THE Dev_Scripts SHALL start only the FastAPI server
4. WHEN a developer runs `pnpm dev:web`, THE Dev_Scripts SHALL start only the web frontend
5. WHEN a developer runs `pnpm db:migrate`, THE Dev_Scripts SHALL execute Alembic upgrade head
6. WHEN a developer runs `pnpm db:reset`, THE Dev_Scripts SHALL drop the database volume, recreate containers, run migrations, and seed data
7. WHEN a developer runs `pnpm seed`, THE Dev_Scripts SHALL populate the database with dev users and sample properties/florists

### Requirement 5: Production Promotion Workflow

**User Story:** As a developer, I want a documented workflow for promoting local changes to production, so that deployments are predictable and require no manual patching.

#### Acceptance Criteria

1. WHEN a developer merges changes to main branch, THE Promote_Workflow SHALL trigger automatic web deployment via Amplify
2. WHEN a developer merges changes to main branch, THE Promote_Workflow SHALL trigger automatic API deployment via App Runner (or document manual steps if not configured)
3. WHEN deploying to production, THE Promote_Workflow SHALL require only environment variable differences between local and production (no code changes)
4. THE Promote_Workflow SHALL be documented in docs/dev.md with prerequisites, commands, and troubleshooting steps

### Requirement 6: End-to-End Local Verification

**User Story:** As a developer, I want to verify the full local stack works end-to-end, so that I have confidence my local environment matches production behavior.

#### Acceptance Criteria

1. WHEN a developer starts the full local stack from a fresh clone, THE Local_Dev_Environment SHALL have Postgres running, API connected with migrations applied, and web pointing at local API
2. WHEN a developer creates a property from the admin UI locally, THE Local_Dev_Environment SHALL persist the property to the local PostgreSQL database
3. WHEN a developer queries the local database, THE Local_Dev_Environment SHALL return the created property data
