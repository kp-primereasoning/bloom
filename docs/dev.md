# Local Development Guide

## Prerequisites

Before starting local development, ensure you have:

- **Docker Desktop** - [Install Docker](https://docs.docker.com/get-docker/)
- **Node.js 18+** - [Install Node.js](https://nodejs.org/)
- **pnpm** - Install with `npm install -g pnpm`
- **Python 3.11+** - [Install Python](https://www.python.org/downloads/)
- **Python dependencies** - Run `pip install -r apps/api/requirements.txt`

## Quick Start

From a fresh clone:

```bash
# Install dependencies
pnpm install

# Start everything (Postgres + API + Web)
pnpm dev
```

This starts:
- PostgreSQL on `localhost:5432`
- FastAPI on `http://localhost:8000`
- Vite dev server on `http://localhost:5173`

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all services (db, api, web) concurrently |
| `pnpm dev:db` | Start only PostgreSQL container |
| `pnpm dev:api` | Start only FastAPI server with hot-reload |
| `pnpm dev:web` | Start only Vite dev server |
| `pnpm db:migrate` | Run Alembic migrations |
| `pnpm db:reset` | Drop database, recreate, migrate, and seed |
| `pnpm seed` | Seed development data (users, properties, florists) |

## Development Credentials

After seeding, these accounts are available:

| Email | Password | Role |
|-------|----------|------|
| admin@bloom.example.com | bloom123 | Admin |
| florist@bloom.example.com | bloom123 | Florist |
| pm@bloom.example.com | bloom123 | Property Manager |
| customer@bloom.example.com | bloom123 | Customer |

## Environment Configuration

### API (.env.local)

Located at `apps/api/.env.local`:

```bash
DATABASE_URL=postgresql://bloom:bloom@localhost:5432/bloom
JWT_SECRET=local-dev-secret-key-not-for-production
ENVIRONMENT=development
```

### Web (.env.local)

Located at `apps/web/.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Database Access

Connect directly to the local PostgreSQL:

```bash
# Using psql via Docker
docker exec -it bloom-postgres psql -U bloom -d bloom

# Example queries
SELECT * FROM users;
SELECT * FROM properties;
SELECT * FROM florists;
```

## Troubleshooting

### Port Already in Use

If port 5432, 8000, or 5173 is in use:

```bash
# Find process using port (Windows)
netstat -ano | findstr :5432

# Kill process by PID
taskkill /PID <pid> /F
```

### Docker Not Running

Ensure Docker Desktop is running before starting `pnpm dev:db`.

### Database Connection Failed

1. Verify Postgres is running: `docker ps`
2. Check container logs: `docker logs bloom-postgres`
3. Reset database: `pnpm db:reset`

### API Won't Start

1. Ensure Python dependencies are installed: `pip install -r apps/api/requirements.txt`
2. Verify `.env.local` exists in `apps/api/`
3. Check that Postgres is running and accessible

### Web App Can't Connect to API

1. Verify API is running on port 8000
2. Check `apps/web/.env.local` has correct `VITE_API_BASE_URL`
3. Check browser console for CORS errors

---

## Promote to Production

### Workflow

1. **Develop locally** - Make changes, test with `pnpm dev`
2. **Create PR** - Push branch, open pull request
3. **Merge to main** - After review, merge to `main` branch
4. **Auto-deploy** - Amplify (web) and App Runner (API) deploy automatically

### What Deploys Automatically

| Service | Trigger | Platform |
|---------|---------|----------|
| Web Frontend | Push to `main` | AWS Amplify |
| API Backend | Push to `main` | AWS App Runner |

---

## API Deployment (App Runner)

### Automatic Deployment

App Runner automatically deploys when:
- Code is pushed to `main` branch
- Container image is updated in ECR

### Manual Deployment

If auto-deploy is not configured or you need to force a deployment:

```bash
cd apps/api
./deploy.sh
```

### Required Environment Variables

Configure these in App Runner console:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `ENVIRONMENT` | `production` | Yes |
| `SENTRY_DSN` | Sentry error tracking DSN | No |
| `CORS_ORIGINS` | Comma-separated allowed origins | Yes |

### Health Checks

App Runner uses these endpoints for health monitoring:
- `/health` - Basic API health (always returns 200)
- `/health/db` - Database connectivity check (returns 200 if DB is reachable)

---

## Web Deployment (Amplify)

### Automatic Deployment

Amplify automatically deploys when code is pushed to `main` branch.

Build configuration is in `amplify.yml`:
- Installs pnpm and dependencies
- Builds the web app with production settings
- Outputs to `apps/web/dist`

### Required Environment Variables

Configure these in Amplify console:

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Production API URL (e.g., `https://api.bloom.example.com`) |

### Build Settings

The build runs from the monorepo root:
```yaml
build:
  commands:
    - npm install -g pnpm
    - pnpm install
    - pnpm --filter web build
```

---

## Database Migrations

### When Migrations Run

Migrations run automatically on API startup via Alembic:
- FastAPI startup event triggers migration check
- Only pending migrations are applied
- Safe to run multiple times (idempotent)

### Manual Migration

To run migrations manually:

```bash
# Local
cd apps/api
alembic upgrade head

# Production (via App Runner exec or bastion)
alembic upgrade head
```

### Creating New Migrations

```bash
cd apps/api
alembic revision --autogenerate -m "description_of_change"
```

### Rollback

To rollback the last migration:

```bash
alembic downgrade -1
```

To rollback to a specific revision:

```bash
alembic downgrade <revision_id>
```

---

## Environment Variables Reference

### Local vs Production

| Variable | Local | Production |
|----------|-------|------------|
| `DATABASE_URL` | `postgresql://bloom:bloom@localhost:5432/bloom` | RDS connection string |
| `JWT_SECRET` | `local-dev-secret-key-not-for-production` | Secure production secret |
| `ENVIRONMENT` | `development` | `production` |
| `SENTRY_DSN` | (optional) | Sentry project DSN |
| `CORS_ORIGINS` | `http://localhost:5173` | Production frontend URL |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Production API URL |

---

## Post-Deployment Verification

### Checklist

After deploying to production, verify:

1. **API Health**
   ```bash
   curl https://your-api-url/health
   # Expected: {"status": "healthy"}
   
   curl https://your-api-url/health/db
   # Expected: {"status": "healthy", "database": "connected"}
   ```

2. **Web App Loads**
   - Navigate to production URL
   - Verify login page renders
   - Check browser console for errors

3. **Authentication Works**
   - Log in with test credentials
   - Verify JWT token is returned
   - Verify protected routes are accessible

4. **Database Connectivity**
   - Check `/health/db` returns 200
   - Verify data loads on admin pages

5. **Error Tracking (if Sentry configured)**
   - Trigger a test error
   - Verify it appears in Sentry dashboard

---

## Customer Onboarding Flow

### Overview

New customers can self-onboard through a 3-step flow:
1. **Register** - Create account with email/password
2. **Select Property** - Choose their apartment complex
3. **Activate** - Confirm and activate subscription

### Testing Locally

1. Start the development stack:
   ```bash
   pnpm dev
   ```

2. Open the onboarding flow:
   ```
   http://localhost:5173/onboarding/register
   ```

3. Complete the flow:
   - Enter email and password (min 6 characters)
   - Select a property from the list
   - Click "Activate Subscription"
   - You'll be redirected to the customer dashboard

### Deep Links from Marketing Site

The marketing site can link directly to onboarding with pre-filled data:

```
https://your-app-url/onboarding/register?email=user@example.com&property_id=<uuid>
```

Query parameters:
- `email` - Pre-fills the email field
- `property_id` - Pre-selects the property (stored in sessionStorage)

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | Public | Create customer account |
| `/properties` | GET | Public | List available properties |
| `/me/property` | PATCH | Customer | Assign property to self |
| `/me/subscription` | PATCH | Customer | Activate subscription |

### Onboarding State Machine

```
CREATED (no property) → CREATED (with property) → ACTIVE
                                                 → PAUSED
```

The routing guard automatically redirects customers based on their state:
- No property → `/onboarding/property`
- Status CREATED → `/onboarding/subscription`
- Status ACTIVE/PAUSED → `/customer` dashboard

### Smoke Test Commands

```bash
# Check API is responding
curl -s https://your-api-url/health | jq .

# Check DB connectivity
curl -s https://your-api-url/health/db | jq .

# Test login endpoint
curl -s -X POST https://your-api-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bloom.example.com","password":"bloom123"}' | jq .
```

### Monitoring

- **Amplify Console**: Check build logs and deployment status
- **App Runner Console**: Check service logs and metrics
- **CloudWatch**: View API logs and set up alarms
- **Sentry**: Monitor errors and performance (if configured)
