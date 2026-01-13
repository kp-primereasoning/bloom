# Implementation Plan: Local Dev Setup

## Overview

Implement a streamlined local development environment using Docker Compose for PostgreSQL, environment-specific configuration files, and root-level pnpm scripts. The implementation follows the existing codebase patterns and requires minimal changes.

## Tasks

- [x] 1. Set up Docker Compose for local PostgreSQL
  - [x] 1.1 Create docker-compose.yml at repo root
    - Define postgres:15 service with bloom/bloom credentials
    - Configure named volume `bloom_pgdata` for persistence
    - Expose port 5432:5432
    - Add healthcheck for container readiness
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Create init-db.sql for test database
    - Create bloom_test database on container initialization
    - Grant privileges to bloom user
    - _Requirements: 1.4_

- [x] 2. Configure local environment files
  - [x] 2.1 Create apps/api/.env.local
    - Set DATABASE_URL for local Postgres
    - Set JWT_SECRET for local development
    - Set ENVIRONMENT=development
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Create apps/web/.env.local
    - Set VITE_API_BASE_URL=http://localhost:8000
    - _Requirements: 3.1, 3.2_
  - [x] 2.3 Update .gitignore to exclude .env.local files
    - Add pattern to ignore all .env.local files
    - _Requirements: 5.3_

- [x] 3. Add root-level dev scripts
  - [x] 3.1 Install concurrently as dev dependency
    - Add concurrently package for parallel script execution
    - _Requirements: 4.1_
  - [x] 3.2 Update package.json with dev scripts
    - Add `dev` script to start all services concurrently
    - Add `dev:db` script to start only PostgreSQL
    - Add `dev:api` script to start only FastAPI
    - Add `dev:web` script (already exists, verify)
    - Add `db:migrate` script for Alembic migrations
    - Add `db:reset` script for full database reset
    - Add `seed` script for seeding dev data
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 4. Create developer documentation
  - [x] 4.1 Create docs/dev.md
    - Document prerequisites (Docker, pnpm, Python)
    - Document all available commands
    - Document troubleshooting steps
    - Document promote-to-prod workflow
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 5. Checkpoint - Verify local stack works
  - Start full stack with `pnpm dev`
  - Verify Postgres is running and accessible
  - Verify API connects and migrations run
  - Verify web app loads and points to local API
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 6.1_

- [x] 6. Property tests for idempotence
  - [x] 6.1 Write property test for migration idempotence
    - **Property 2: Migration Idempotence**
    - **Validates: Requirements 2.3**
  - [x] 6.2 Write property test for seed idempotence
    - **Property 3: Seed Data Idempotence**
    - **Validates: Requirements 4.7**

- [x] 7. Update CHANGELOG.md
  - Add entry for local dev setup feature
  - Document what was built and its purpose

## Notes

- The existing API already handles CORS for localhost:5173 and runs migrations on startup
- The existing seed.py already checks for existing data before seeding
- Windows users may need to adjust the db:reset script for timeout command
