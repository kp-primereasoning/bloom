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

### Environment Variables

Local and production use the same code. Only environment variables differ:

| Variable | Local | Production |
|----------|-------|------------|
| `DATABASE_URL` | Local Postgres | RDS connection string |
| `JWT_SECRET` | Dev secret | Secure production secret |
| `ENVIRONMENT` | `development` | `production` |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Production API URL |

### Manual API Deployment (if needed)

If App Runner auto-deploy is not configured:

```bash
cd apps/api
./deploy.sh
```

### Verifying Production

After merge:
1. Check Amplify console for web deployment status
2. Check App Runner console for API deployment status
3. Test production endpoints manually
