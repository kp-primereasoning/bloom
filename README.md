# Bloom

Bloom is a property-based floral subscription orchestration platform.

## Project Structure

```
bloom/
├── apps/
│   ├── web/          # Vite + React + TypeScript frontend
│   └── api/          # FastAPI backend service
├── packages/
│   └── shared/       # Shared TypeScript types and validation
├── docs/             # Documentation
└── infra/            # Infrastructure configuration
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.11+

## Getting Started

### Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm

# Install frontend dependencies
cd apps/web
pnpm install

# Install backend dependencies
cd apps/api
pip install -r requirements.txt
```

### Run the Web App

```bash
cd apps/web
pnpm dev
```

The web app will be available at http://localhost:5173

### Run the API

```bash
cd apps/api
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

Health check: http://localhost:8000/health

## Development

### Frontend Scripts

```bash
cd apps/web

# Start development server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

### Backend Scripts

```bash
cd apps/api

# Run with auto-reload
uvicorn main:app --reload

# Format code (requires ruff)
ruff format .

# Lint code
ruff check .
```

## Environment Variables

### Web App (`apps/web/.env`)

```env
# API URL (optional, defaults to localhost:8000)
VITE_API_URL=http://localhost:8000
```

### API (`apps/api/.env`)

```env
# No environment variables required for local development
```

## User Roles

The platform supports 4 user roles:

| Role | Namespace | Default Page |
|------|-----------|--------------|
| Customer | `/customer` | `/customer/home` |
| Property Manager | `/pm` | `/pm/overview` |
| Florist | `/florist` | `/florist/deliveries` |
| Admin | `/admin` | `/admin/properties` |

Use the role switcher in the top bar to switch between roles during development.

## License

Proprietary - All rights reserved
