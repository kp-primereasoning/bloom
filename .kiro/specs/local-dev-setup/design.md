# Design Document: Local Dev Setup

## Overview

This design establishes a streamlined local development environment for the Bloom platform monorepo. The solution uses Docker Compose for PostgreSQL, environment-specific `.env.local` files for configuration, and root-level pnpm scripts for unified developer experience. The design prioritizes simplicity, reliability, and minimal setup time.

## Architecture

```mermaid
graph TB
    subgraph "Local Development Stack"
        DC[Docker Compose]
        PG[(PostgreSQL 15<br/>bloom + bloom_test)]
        API[FastAPI Server<br/>:8000]
        WEB[Vite Dev Server<br/>:5173]
    end
    
    subgraph "Configuration"
        ENV_API[apps/api/.env.local]
        ENV_WEB[apps/web/.env.local]
    end
    
    subgraph "Scripts"
        PKG[package.json scripts]
    end
    
    DC --> PG
    API --> PG
    WEB --> API
    ENV_API --> API
    ENV_WEB --> WEB
    PKG --> DC
    PKG --> API
    PKG --> WEB
```

## Components and Interfaces

### 1. Docker Compose Configuration

**File**: `docker-compose.yml` (repo root)

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: bloom-postgres
    environment:
      POSTGRES_DB: bloom
      POSTGRES_USER: bloom
      POSTGRES_PASSWORD: bloom
    ports:
      - "5432:5432"
    volumes:
      - bloom_pgdata:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bloom -d bloom"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  bloom_pgdata:
```

**File**: `init-db.sql` (repo root)

```sql
-- Create test database for isolated testing
CREATE DATABASE bloom_test;
GRANT ALL PRIVILEGES ON DATABASE bloom_test TO bloom;
```

### 2. API Local Configuration

**File**: `apps/api/.env.local`

```bash
# Local development configuration
DATABASE_URL=postgresql://bloom:bloom@localhost:5432/bloom
JWT_SECRET=local-dev-secret-key-not-for-production
ENVIRONMENT=development
```

The existing `main.py` already:
- Includes CORS for `http://localhost:5173`
- Runs migrations on startup
- Seeds dev data when `ENVIRONMENT=development`

### 3. Web Local Configuration

**File**: `apps/web/.env.local`

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Vite automatically loads `.env.local` files and prioritizes them over `.env`.

### 4. Root Package.json Scripts

**Updated**: `package.json` (repo root)

```json
{
  "scripts": {
    "dev": "concurrently -n db,api,web -c blue,green,yellow \"pnpm dev:db\" \"pnpm dev:api\" \"pnpm dev:web\"",
    "dev:db": "docker compose up postgres",
    "dev:api": "cd apps/api && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000",
    "dev:web": "pnpm --filter web dev",
    "db:migrate": "cd apps/api && python -m alembic upgrade head",
    "db:reset": "docker compose down -v && docker compose up -d postgres && timeout 5 && pnpm db:migrate && pnpm seed",
    "seed": "cd apps/api && python -c \"import asyncio; from db.seed import seed_dev_users; asyncio.run(seed_dev_users())\""
  }
}
```

### 5. Script Execution Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Scripts as pnpm scripts
    participant Docker as Docker Compose
    participant PG as PostgreSQL
    participant API as FastAPI
    participant Web as Vite

    Dev->>Scripts: pnpm dev
    Scripts->>Docker: docker compose up postgres
    Docker->>PG: Start container
    PG-->>Docker: Ready (healthcheck)
    Scripts->>API: uvicorn main:app --reload
    API->>PG: Run migrations
    API->>PG: Seed dev data
    Scripts->>Web: vite dev
    Web-->>Dev: http://localhost:5173
```

## Data Models

No new data models required. The existing models (User, Property, Florist) are used with the seed data defined in `apps/api/db/seed.py`.

### Seed Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Users | 4 | admin, florist, pm, customer (all password: bloom123) |
| Properties | 3 | The Meridian, Harbor View, Parkside |
| Florists | 3 | Bloom & Petal, Garden Gate, Fresh Start |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Data Persistence Round-Trip

*For any* data written to the PostgreSQL database, if the container is stopped and restarted, the data SHALL still be present and queryable.

**Validates: Requirements 1.3**

### Property 2: Migration Idempotence

*For any* sequence of `pnpm db:migrate` executions (1 or more times), the resulting database schema SHALL be identical to running migrations exactly once.

**Validates: Requirements 2.3**

### Property 3: Seed Data Idempotence

*For any* sequence of `pnpm seed` executions (1 or more times), the number of seeded records SHALL remain constant (no duplicates created).

**Validates: Requirements 4.7**

### Property 4: Environment Configuration Isolation

*For any* deployment target (local or production), the same codebase SHALL function correctly with only environment variable differences (no code changes required).

**Validates: Requirements 5.3**

### Property 5: Entity Creation Round-Trip

*For any* entity (Property, Florist, User) created via the admin API locally, querying the local PostgreSQL database directly SHALL return the same entity data with matching field values.

**Validates: Requirements 6.2, 6.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Docker not running | `dev:db` fails with clear Docker error message |
| Port 5432 in use | Docker Compose fails with port conflict error |
| Port 8000 in use | Uvicorn fails with address already in use |
| Port 5173 in use | Vite fails with port conflict (or auto-selects next port) |
| Database not ready | API startup retries connection (existing behavior) |
| Missing .env.local | API uses defaults from .env.example or environment |

## Testing Strategy

### Unit Tests
- Verify seed data creation is idempotent
- Verify environment variable loading precedence

### Integration Tests
- Full stack startup from fresh state
- Create entity via API → verify in database
- Auth flow: login → JWT → protected endpoint

### Manual Verification Checklist
1. Fresh clone → `pnpm install` → `pnpm dev` → all services running
2. Navigate to http://localhost:5173 → login as admin@bloom.example.com / bloom123
3. Create a new property via admin UI
4. Query database: `docker exec bloom-postgres psql -U bloom -d bloom -c "SELECT * FROM properties;"`
5. Verify new property appears

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| `docker-compose.yml` | Create | PostgreSQL container definition |
| `init-db.sql` | Create | Create bloom_test database |
| `apps/api/.env.local` | Create | Local API configuration |
| `apps/web/.env.local` | Create | Local web configuration |
| `package.json` | Update | Add dev scripts |
| `.gitignore` | Update | Ignore .env.local files |
| `docs/dev.md` | Create | Developer documentation |
