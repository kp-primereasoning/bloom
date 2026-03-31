# Bloom

Bloom is a property-based floral subscription orchestration platform that connects properties, florists, and residents. The platform orchestrates floral deliveries without selling flowers directly — Shopify is the system of record for all products and pricing.

## Key Concepts

- Bloom does NOT sell flowers — orchestration only
- Shopify is the system of record for products and pricing
- One delivery cadence per property (no per-resident customization)
- Bloom controls florist assignment (residents cannot choose florists)

## Live URLs

| Service | URL |
|---------|-----|
| Landing page | https://blooms.now |
| Web app | https://app.blooms.now |
| API | https://api.blooms.now |
| API docs (Swagger) | https://api.blooms.now/docs |
| Cognito Hosted UI | https://bloom-dev.auth.us-east-1.amazoncognito.com |

## Project Structure

```
bloom/
├── apps/
│   ├── web/              # React + Vite + TypeScript (customer/admin/florist/PM dashboards)
│   ├── api/              # FastAPI + Python backend
│   ├── landing/          # Next.js marketing site
│   └── shopify-app/      # Remix-based Shopify embedded app for florists
├── packages/
│   └── shared/           # Shared TypeScript types
├── docs/                 # Architecture docs, dev guide
├── infra/                # AWS CDK stack
└── amplify.yml           # Amplify build config (landing page)
```

## User Roles

| Role | Description | Dashboard |
|------|-------------|-----------|
| Customer | Residents who subscribe to floral deliveries | `/customer/*` |
| Property Manager | Building/complex managers | `/pm/*` |
| Florist | Flower vendors connected via Shopify | `/florist/*` |
| Admin | Bloom platform administrators | `/admin/*` |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend (app) | React 18, Vite, TypeScript, Tailwind CSS, Motion |
| Frontend (landing) | Next.js 16, React 19, TypeScript |
| Backend | FastAPI, Python 3.12, SQLAlchemy, Alembic |
| Database | PostgreSQL 15 (Amazon RDS) |
| Auth | AWS Cognito (Google OAuth + email/password), JWT |
| Payments | Stripe (subscriptions, invoices, payouts) |
| Hosting | AWS Amplify, App Runner, CloudFront, S3 |
| Testing | Vitest + fast-check (frontend), Pytest + Hypothesis (backend) |

---

## AWS Infrastructure

All resources are in `us-east-1`. Domain `blooms.now` is registered via Route 53.

### DNS (Route 53)

| Record | Type | Target |
|--------|------|--------|
| `blooms.now` | A (alias) | CloudFront `d1zz7u94hqqx5u.cloudfront.net` (landing) |
| `www.blooms.now` | CNAME | CloudFront `d1zz7u94hqqx5u.cloudfront.net` (landing) |
| `app.blooms.now` | CNAME | CloudFront `d3pwlf4wvtcq5h.cloudfront.net` (web app) |
| `api.blooms.now` | CNAME | App Runner `pippp4x35x.us-east-1.awsapprunner.com` |

Hosted zone: `Z06672292IIWWCWG2KQHG`

### Compute

| Service | Resource | Details |
|---------|----------|---------|
| App Runner | `bloom-api` | FastAPI container, auto-deploys from ECR, custom domain `api.blooms.now` |
| Lambda | `bloom-dev-generate-deliveries` | Python 3.12, 128 MB, 30s timeout. Generates daily delivery orders |
| EventBridge | `bloom-dev-daily-deliveries` | `cron(0 6 * * ? *)` — triggers Lambda at 6 AM UTC daily |

### Frontend Hosting

| Amplify App | ID | Purpose | Source |
|-------------|-----|---------|--------|
| `bloom` | `d16hr5zrev5jhh` | Web app (React/Vite) | `apps/web` via GitHub |
| `bloom-landing` | `dyspvdc2idyd3` | Landing page (Next.js) | `apps/landing` via GitHub |

Both auto-deploy from the `main` branch.

### Database

| Resource | Details |
|----------|---------|
| RDS instance | `bloom-dev` |
| Engine | PostgreSQL 15.14 |
| Instance class | db.t3.micro |
| Storage | 20 GB, encrypted (AES-256) |
| Multi-AZ | No |
| Endpoint | `bloom-dev.cfkgs26u8dtb.us-east-1.rds.amazonaws.com` |

### Authentication (Cognito)

| Setting | Value |
|---------|-------|
| User Pool | `bloom-dev` (`us-east-1_1sSZXSPwv`) |
| App Client | `bloom-web` (`5j7l03d6avbg43fh0hvvslom2f`) |
| Domain | `bloom-dev.auth.us-east-1.amazoncognito.com` |
| Identity Providers | Cognito (email/password), Google |
| OAuth flows | Authorization code |
| Scopes | openid, email, profile |
| Callback URLs | `https://app.blooms.now/auth/callback`, `http://localhost:5173/auth/callback` |
| Password policy | 8+ chars, uppercase, lowercase, digits required |

### Storage

| Bucket | Purpose |
|--------|---------|
| `bloom-dev-delivery-photos` | Delivery proof photos (presigned URL upload/download) |
| `bloom-web-hosting-282939815209` | Web app static assets |

### Container Registry (ECR)

| Repository | URI |
|------------|-----|
| `bloom-api` | `282939815209.dkr.ecr.us-east-1.amazonaws.com/bloom-api` |

Scan-on-push enabled, AES-256 encryption.

### Secrets Manager

| Secret | Purpose |
|--------|---------|
| `bloom/dev/db-credentials` | RDS PostgreSQL credentials |
| `bloom/dev/jwt-secret` | JWT signing key |
| `bloom/dev/cognito` | Cognito pool/client config |
| `bloom/dev/lambda-admin-token` | Admin JWT for Lambda → API calls |

### Monitoring (CloudWatch)

| Alarm | Condition |
|-------|-----------|
| `bloom-dev-api-5xx-errors` | App Runner 5xx count > 5 in 5 min |
| `bloom-dev-lambda-errors` | Lambda errors > 1 in 5 min |
| `bloom-dev-rds-cpu` | RDS CPU > 80% for 15 min |
| `bloom-dev-rds-storage` | RDS free storage < 1 GB |

### Other Services

| Service | Usage |
|---------|-------|
| SES | Transactional emails (welcome, delivery notifications, payment receipts) |
| CloudFront | CDN for landing page and web app |
| WAF | Attached to `bloom-landing` Amplify app |

---

## Database Schema

### Core Tables


#### `properties`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| address | VARCHAR(500) | |
| status | ENUM | CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE, ARCHIVED |
| delivery_cadence | VARCHAR(100) | e.g. "weekly", "biweekly" |
| next_delivery_date | TIMESTAMP | Next scheduled delivery |
| delivery_lead_days | INTEGER | Default 3 |
| property_manager_id | UUID | FK → users.id |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Status is auto-computed: CREATED (no assignments) → PENDING_FLORIST/PENDING_PM → ACTIVE (both assigned).

#### `florists`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| status | ENUM | ONBOARDING, READY, ARCHIVED |
| created_at | TIMESTAMP | |

#### `property_assignments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| property_id | UUID | FK → properties.id |
| florist_id | UUID | FK → florists.id |
| active | BOOLEAN | Partial unique index: one active per property |
| created_at | TIMESTAMP | |

#### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| email | VARCHAR(255) | Unique |
| hashed_password | VARCHAR(255) | |
| role | ENUM | CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN |
| status | ENUM | ACTIVE, ARCHIVED |
| property_id | UUID | FK → properties.id (customers & PMs) |
| unit | VARCHAR(50) | Apartment/unit number |
| subscription_status | ENUM | CREATED, ACTIVE, PAUSED |
| subscription_plan | ENUM | ESSENTIAL, SIGNATURE, STATEMENT |
| florist_id | UUID | FK → florists.id (florist users) |
| stripe_customer_id | VARCHAR(255) | |
| stripe_subscription_id | VARCHAR(255) | |
| skip_next_delivery | BOOLEAN | Default false |
| email_notifications_enabled | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `deliveries`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | |
| property_id | UUID | FK → properties.id |
| subscription_plan | ENUM | ESSENTIAL, SIGNATURE, STATEMENT |
| status | ENUM | SCHEDULED, DELIVERED, SKIPPED, MISSED |
| scheduled_for | TIMESTAMP | |
| delivered_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| archived_at | TIMESTAMP | Soft delete |

### Payment Tables

#### `payments`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | |
| property_id | UUID | FK → properties.id |
| stripe_payment_intent_id | VARCHAR(255) | Unique |
| amount_cents | INTEGER | |
| currency | VARCHAR(3) | Default "usd" |
| status | ENUM | PENDING, SUCCEEDED, FAILED, REFUNDED |
| subscription_plan | VARCHAR(20) | |
| created_at | TIMESTAMP | |

#### `invoices`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | |
| stripe_invoice_id | VARCHAR(255) | Unique |
| amount_cents | INTEGER | |
| currency | VARCHAR(3) | |
| status | VARCHAR(50) | |
| period_start | TIMESTAMP | |
| period_end | TIMESTAMP | |
| pdf_url | VARCHAR(1000) | |
| created_at | TIMESTAMP | |

#### `florist_payouts`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| florist_id | UUID | FK → florists.id |
| stripe_transfer_id | VARCHAR(255) | Unique |
| amount_cents | INTEGER | |
| status | ENUM | PENDING, COMPLETED, FAILED |
| period_start | TIMESTAMP | |
| period_end | TIMESTAMP | |
| created_at | TIMESTAMP | |

### Shopify Integration Tables

#### `florist_connections`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| florist_id | UUID | FK → florists.id |
| shop_domain | VARCHAR(255) | Unique |
| api_key_hash | VARCHAR(128) | SHA-256, unique |
| connected_at | TIMESTAMP | |
| last_sync_at | TIMESTAMP | |
| synced_count | INTEGER | |

#### `florist_products`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| connection_id | UUID | FK → florist_connections.id |
| shopify_product_id | VARCHAR(64) | |
| shopify_variant_id | VARCHAR(64) | |
| title | VARCHAR(500) | |
| price | VARCHAR(20) | |
| image_url | VARCHAR(2048) | |
| inventory_quantity | INTEGER | |
| status | VARCHAR(20) | |
| synced_at | TIMESTAMP | |

#### `florist_tier_mappings`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| connection_id | UUID | FK → florist_connections.id |
| tier | VARCHAR(20) | ESSENTIAL, SIGNATURE, or STATEMENT |
| shopify_product_id | VARCHAR(64) | |
| product_title | VARCHAR(500) | |
| product_price | VARCHAR(20) | |
| mapped_at | TIMESTAMP | |

Unique constraint on (connection_id, tier).

#### `florist_availability`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| florist_id | UUID | FK → florists.id |
| day_of_week | INTEGER | 0=Mon, 6=Sun |
| max_deliveries_per_day | INTEGER | Default 10 |
| is_available | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Property Manager Tables

#### `property_rewards`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| property_id | UUID | FK → properties.id, unique |
| tier | VARCHAR(10) | Bronze, Silver, Gold |
| participation_rate | NUMERIC(5,2) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `pm_preferences`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | Unique |
| delivery_reminders | BOOLEAN | Default true |
| participation_updates | BOOLEAN | Default true |
| rewards_milestones | BOOLEAN | Default true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Audit Tables

#### `webhook_events`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| source | VARCHAR(50) | "stripe" or "shopify" |
| event_type | VARCHAR(100) | |
| event_id | VARCHAR(255) | External ID for dedup |
| payload_hash | VARCHAR(64) | SHA-256 |
| status | VARCHAR(20) | received, processed, failed |
| error_message | TEXT | |
| created_at | TIMESTAMP | |

#### `waitlist_entries`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → users.id |
| building_name | VARCHAR(255) | |
| building_address | VARCHAR(500) | |
| status | VARCHAR(20) | PENDING, CONTACTED, ACTIVATED |
| created_at | TIMESTAMP | |

---

## API Endpoints

Base URL: `https://api.blooms.now`

All protected endpoints require `Authorization: Bearer <jwt>` header. Role requirements noted in parentheses.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Basic health check |
| GET | `/health/db` | None | Database connectivity check |
| GET | `/health/full` | None | Full service status (DB, S3, Cognito, SES) |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/cognito/callback` | None | Exchange Cognito auth code for JWT + provision user |
| POST | `/auth/register` | None | Register new customer (email/password) |
| POST | `/auth/login` | None | Login, returns JWT |
| POST | `/auth/refresh` | None | Refresh JWT token |
| GET | `/auth/me` | Any | Current user profile with property name |
| POST | `/auth/waitlist` | Any | Submit waitlist entry for unlisted building |
| POST | `/auth/dev/switch-role` | None | Dev-only: switch user role |

### Customer Self-Service (`/me`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/me/property` | Customer | Set property and unit |
| PATCH | `/me/subscription` | Customer | Activate, pause, or resume subscription |
| PATCH | `/me/plan` | Customer | Select subscription plan (Essential/Signature/Statement) |
| GET | `/me/deliveries` | Customer | Delivery history |
| GET | `/me/notification-preferences` | Customer, Florist | Get notification settings |
| PATCH | `/me/notification-preferences` | Customer, Florist | Update notification settings |
| PATCH | `/me/skip-next-delivery` | Customer | Skip next scheduled delivery |

### Payments (`/payments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/setup-intent` | Customer | Create Stripe SetupIntent for card collection |
| POST | `/payments/subscribe` | Customer | Create Stripe subscription |
| POST | `/payments/cancel` | Customer | Cancel subscription |
| GET | `/payments/invoices` | Customer | List invoices |
| GET | `/payments/payment-method` | Customer | Get current payment method |
| PATCH | `/payments/payment-method` | Customer | Update payment method |

### Florist Dashboard (`/florist`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/florist/ping` | Florist | Test endpoint |
| GET | `/florist/me` | Florist | Florist profile + assigned properties |
| GET | `/florist/deliveries` | Florist | Upcoming and past deliveries |
| PATCH | `/florist/deliveries/{id}` | Florist | Mark delivery as DELIVERED or MISSED |
| GET | `/florist/availability` | Florist | Per-day capacity settings |
| PUT | `/florist/availability` | Florist | Update availability and capacity |

### Shopify Integration (`/api/florists`)

These endpoints use `X-API-Key` header auth (not JWT).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/florists/validate-key` | API Key | Validate florist API key |
| GET | `/api/florists/connection` | API Key | Connection status |
| POST | `/api/florists/disconnect` | API Key | Disconnect Shopify store |
| POST | `/api/florists/products/sync` | API Key | Sync products from Shopify |
| GET | `/api/florists/products` | API Key | List synced products |
| GET | `/api/florists/tier-mappings` | API Key | Get tier → product mappings |
| POST | `/api/florists/tier-mappings` | API Key | Set tier mapping |
| DELETE | `/api/florists/tier-mappings/{tier}` | API Key | Remove tier mapping |
| POST | `/api/florists/status/ready` | API Key | Mark florist as ready for deliveries |
| GET | `/api/florists/dashboard` | API Key | Dashboard data for Shopify app |
| POST | `/api/florists/products/update` | API Key | Webhook: product updated in Shopify |
| POST | `/api/florists/products/delete` | API Key | Webhook: product deleted in Shopify |

### Property Manager (`/pm`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pm/ping` | PM | Test endpoint |
| GET | `/pm/stats` | PM | Dashboard stats (next delivery, participation rate) |
| GET | `/pm/residents` | PM | Resident list with plan distribution |
| GET | `/pm/deliveries` | PM | Delivery history with pagination and filters |
| GET | `/pm/rewards` | PM | Reward tier, benefits, and progress |
| GET | `/pm/settings` | PM | Profile and notification preferences |
| PATCH | `/pm/settings` | PM | Update notification preferences |

### Admin (`/admin`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/ping` | Admin | Test endpoint |
| POST | `/admin/properties` | Admin | Create property |
| GET | `/admin/properties` | Admin | List properties (enriched with user counts, florist, PM) |
| PATCH | `/admin/properties/{id}` | Admin | Update property |
| PATCH | `/admin/properties/{id}/assign-pm` | Admin | Assign property manager |
| DELETE | `/admin/properties/{id}` | Admin | Archive property |
| POST | `/admin/florists` | Admin | Create florist |
| GET | `/admin/florists` | Admin | List florists |
| DELETE | `/admin/florists/{id}` | Admin | Archive florist |
| POST | `/admin/florists/{id}/api-key` | Admin | Generate Shopify API key for florist |
| POST | `/admin/property-assignments` | Admin | Assign florist to property |
| GET | `/admin/property-assignments` | Admin | List assignments |
| GET | `/admin/users` | Admin | List users (filterable by role) |
| POST | `/admin/users` | Admin | Create user |
| PATCH | `/admin/users/{id}` | Admin | Update user (role, status, property, subscription) |
| DELETE | `/admin/users/{id}` | Admin | Archive user |
| POST | `/admin/generate-deliveries` | Admin | Manually trigger delivery generation |
| GET | `/admin/waitlist` | Admin | View waitlist entries |

### Admin Payouts (`/admin/payouts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/payouts/generate` | Admin | Generate florist payouts for a period |
| GET | `/admin/payouts` | Admin | List payout history |

### Deliveries (`/deliveries`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/deliveries/{id}/photo/upload-url` | Florist | Get presigned S3 URL for photo upload |
| GET | `/deliveries/{id}/photo` | Any | Get presigned S3 URL for photo download |
| DELETE | `/deliveries/{id}/photo` | Florist, Admin | Delete delivery photo |

### Webhooks (`/webhooks`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/stripe` | Stripe signature | Handles invoice.payment_succeeded/failed, subscription.deleted |

### Public

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/properties` | None | List active properties (for onboarding) |
| GET | `/public/faq` | None | FAQ content |
| GET | `/customer/ping` | Customer | Test endpoint |

---

## Prerequisites

- Node.js 18+
- pnpm 9+
- Python 3.11+
- Docker (for local PostgreSQL)

## Quick Start

```bash
# Install dependencies
pnpm install
cd apps/api && pip install -r requirements.txt

# Start local database
docker-compose up -d

# Run migrations and seed
cd apps/api
alembic upgrade head
python -m db.seed

# Start servers
uvicorn main:app --reload          # API at :8000
cd apps/web && pnpm dev            # Web at :5173
cd apps/landing && pnpm dev        # Landing at :3000
```

## Environment Variables

### Web App (`apps/web/.env.local`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_COGNITO_DOMAIN=bloom-dev.auth.us-east-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=5j7l03d6avbg43fh0hvvslom2f
VITE_COGNITO_REDIRECT_URI=http://localhost:5173/auth/callback
```

### API (`apps/api/.env.local`)
```env
DATABASE_URL=postgresql://bloom:bloom@localhost:5432/bloom
ENVIRONMENT=development
USE_COGNITO=true
COGNITO_USER_POOL_ID=us-east-1_1sSZXSPwv
COGNITO_CLIENT_ID=5j7l03d6avbg43fh0hvvslom2f
COGNITO_REGION=us-east-1
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Landing (`apps/landing/.env.local`)
```env
NEXT_PUBLIC_COGNITO_DOMAIN=bloom-dev.auth.us-east-1.amazoncognito.com
NEXT_PUBLIC_COGNITO_CLIENT_ID=5j7l03d6avbg43fh0hvvslom2f
NEXT_PUBLIC_COGNITO_REDIRECT_URI=https://app.blooms.now/auth/callback
```

## Testing

```bash
# Backend (property-based tests with Hypothesis)
cd apps/api && pytest

# Frontend (Vitest + fast-check)
cd apps/web && pnpm test
```

## Documentation

- [Developer Setup Guide](docs/dev.md)
- [System Design](docs/system-design.md)
- [Changelog](CHANGELOG.md)

## License

Proprietary — All rights reserved
