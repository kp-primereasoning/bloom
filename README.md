# Bloom

Bloom is a property-based floral subscription orchestration platform that connects properties, florists, and residents. The platform orchestrates floral deliveries without selling flowers directly - Shopify is the system of record for all products and pricing.

## Key Concepts

- **Bloom does NOT sell flowers** - orchestration only
- **Shopify is the system of record** for products and pricing
- **One delivery cadence per property** (no per-resident customization)
- **Bloom controls florist assignment** (residents cannot choose florists)

## Project Structure

```
bloom/
├── apps/
│   ├── web/              # React + Vite + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── pages/        # Role-based page components
│   │   │   │   ├── admin/    # Admin dashboard pages
│   │   │   │   ├── customer/ # Customer dashboard pages
│   │   │   │   ├── florist/  # Florist dashboard pages
│   │   │   │   ├── pm/       # Property Manager pages
│   │   │   │   └── onboarding/ # Customer onboarding flow
│   │   │   ├── providers/    # React context providers
│   │   │   ├── router/       # Route configuration
│   │   │   └── config/       # App configuration
│   │   └── package.json
│   │
│   └── api/              # FastAPI + Python backend
│       ├── routes/       # API endpoint handlers
│       ├── models/       # SQLAlchemy ORM models
│       ├── schemas/      # Pydantic request/response schemas
│       ├── services/     # Business logic layer
│       ├── auth/         # JWT authentication
│       ├── db/           # Database connection & seeding
│       ├── middleware/   # Request middleware
│       ├── alembic/      # Database migrations
│       ├── tests/        # Property-based tests
│       └── config/       # Static configuration (FAQ, etc.)
│
├── packages/
│   └── shared/           # Shared TypeScript types
│       └── src/types/    # Domain types, roles, auth types
│
├── docs/
│   ├── dev.md            # Developer setup guide
│   └── system-design.md  # Full system architecture
│
├── .kiro/
│   ├── specs/            # Feature specifications
│   └── steering/         # AI assistant guidelines
│
└── infra/                # Infrastructure documentation
```

## User Roles

| Role | Description | Dashboard |
|------|-------------|-----------|
| **Customer** | Residents who subscribe to floral deliveries | `/customer/*` |
| **Property Manager** | Building/complex managers | `/pm/*` |
| **Florist** | Flower vendors connected to Bloom | `/florist/*` |
| **Admin** | Bloom platform administrators | `/admin/*` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11+, SQLAlchemy |
| Database | PostgreSQL (Amazon RDS) |
| Auth | JWT tokens with role-based access |
| Hosting | AWS Amplify (frontend), AWS App Runner (backend) |
| Testing | Vitest (frontend), Pytest + Hypothesis (backend) |

## Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.11+
- Docker (for local PostgreSQL)

## Quick Start

### 1. Install Dependencies

```bash
# Install pnpm if needed
npm install -g pnpm

# Install all dependencies from root
pnpm install

# Install Python dependencies
cd apps/api
pip install -r requirements.txt
```

### 2. Start Local Database

```bash
# From project root
docker-compose up -d
```

### 3. Run Migrations & Seed Data

```bash
cd apps/api
alembic upgrade head
python -m db.seed
```

### 4. Start Development Servers

```bash
# Terminal 1: API (from apps/api)
uvicorn main:app --reload

# Terminal 2: Web (from apps/web)
pnpm dev
```

- Web: http://localhost:5173
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development Commands

### Frontend (`apps/web`)

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm test         # Run tests
pnpm typecheck    # Type checking
pnpm lint         # Lint code
```

### Backend (`apps/api`)

```bash
uvicorn main:app --reload    # Start with hot reload
pytest                       # Run all tests
pytest -v -k "property"      # Run property-based tests
alembic upgrade head         # Run migrations
alembic revision -m "desc"   # Create new migration
python -m db.seed            # Seed test data
```

## API Endpoints

### Public
- `GET /health` - Health check
- `GET /properties` - List available properties
- `GET /public/faq` - FAQ content

### Authentication
- `POST /auth/register` - Customer registration
- `POST /auth/login` - Login (returns JWT)
- `GET /auth/me` - Current user info

### Customer (`/me/*`)
- `PATCH /me/property` - Set property & unit
- `PATCH /me/subscription` - Update subscription status
- `PATCH /me/plan` - Select subscription plan
- `GET /me/deliveries` - Get delivery history

### Admin (`/admin/*`)
- Properties: `GET/POST/PATCH/DELETE /admin/properties`
- Florists: `GET/POST/DELETE /admin/florists`
- Users: `GET/POST/PATCH/DELETE /admin/users`
- Assignments: `GET/POST /admin/property-assignments`

### Florist (`/florist/*`)
- `GET /florist/me` - Florist profile
- `GET /florist/deliveries` - Upcoming deliveries
- `PATCH /florist/deliveries/{id}` - Update delivery status

### Property Manager (`/pm/*`)
- `GET /pm/stats` - Dashboard statistics
- `GET /pm/residents` - Property residents

## Environment Variables

### Web (`apps/web/.env.local`)
```env
VITE_API_BASE_URL=http://localhost:8000
```

### API (`apps/api/.env.local`)
```env
DATABASE_URL=postgresql://bloom:bloom@localhost:5432/bloom
ENVIRONMENT=development
JWT_SECRET=dev-secret-key
```

## Testing

The project uses property-based testing extensively:

- **Frontend**: Vitest with fast-check for property tests
- **Backend**: Pytest with Hypothesis for property tests

```bash
# Run all backend tests
cd apps/api && pytest

# Run frontend tests
cd apps/web && pnpm test
```

## Documentation

- [Developer Setup Guide](docs/dev.md) - Detailed local setup instructions
- [System Design](docs/system-design.md) - Architecture, data models, APIs
- [Changelog](CHANGELOG.md) - Feature development history

## Deployment

- **Frontend**: AWS Amplify (auto-deploys from `main` branch)
- **Backend**: AWS App Runner with ECR container registry
- **Database**: Amazon RDS PostgreSQL

## License

Proprietary - All rights reserved
