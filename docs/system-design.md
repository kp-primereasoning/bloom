# Bloom Platform — System Design

## Overview

Bloom is a property-based floral subscription orchestration platform. It connects properties, florists, and residents. Bloom does **not** sell flowers — it orchestrates deliveries. Shopify is the system of record for products and pricing.

### Core Principles
- Bloom does NOT sell flowers (orchestration only)
- Shopify is the system of record for products and pricing
- One delivery cadence per property (no per-resident customization)
- Bloom controls florist assignment (residents cannot choose florists)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (React + Vite)                    │
│                   AWS Amplify Hosting                       │
│                                                             │
│  /customer/*   /pm/*   /florist/*   /admin/*   /onboarding  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS / JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               BACKEND API (FastAPI + Python)                │
│                    AWS App Runner                           │
│                                                             │
│  /auth   /me   /admin   /florist   /pm   /payments          │
│  /webhooks   /deliveries   /public   /health                │
└─────────────────────────┬───────────────────────────────────┘
                          │ SQLAlchemy
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL 15)                       │
│                   Amazon RDS                                │
│                                                             │
│  users*  properties  florists  deliveries  payments         │
│  invoices  florist_payouts  property_assignments            │
│  florist_connections  florist_products  florist_tier_mappings│
│  florist_availability  pm_preferences  property_rewards     │
│  webhook_events                                             │
└─────────────────────────────────────────────────────────────┘

* users table is currently in-memory — see Known Issues
```

### Supporting AWS Services
- **Secrets Manager** — DB credentials, JWT secret
- **S3** — Delivery proof photos
- **SES** — Transactional emails
- **EventBridge + Lambda** — Daily delivery generation
- **CloudWatch** — Logs and metrics
- **Sentry** — Error tracking

---

## User Roles

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| CUSTOMER | Residents who subscribe | Subscribe, skip deliveries, manage billing |
| PROPERTY_MANAGER | Building managers | View participation, rewards, resident list |
| FLORIST | Flower vendors | Fulfill deliveries, manage availability, connect Shopify |
| ADMIN | Bloom operators | Manage properties, florists, users, payouts |

---

## Data Model

### ⚠️ Known Issue: Users Are In-Memory

The `User` model is currently stored in a Python dict (`db/users.py`) and is **not persisted to PostgreSQL**. This means:
- All users are lost when the API restarts
- No FK constraints between users and deliveries/payments
- Stripe customer/subscription IDs are lost on restart
- Cannot query users alongside deliveries in SQL

**This must be migrated to a `users` table before production use.** See the migration plan at the end of this document.

---

### Users (currently in-memory)

```
User
├── id                    UUID (PK)
├── email                 String (unique)
├── hashed_password       String
├── role                  CUSTOMER | PROPERTY_MANAGER | FLORIST | ADMIN
├── status                ACTIVE | ARCHIVED
├── property_id           UUID → properties.id (nullable, CUSTOMER/PM only)
├── unit                  String (nullable, CUSTOMER only)
├── subscription_status   CREATED | ACTIVE | PAUSED (CUSTOMER only)
├── subscription_plan     ESSENTIAL | SIGNATURE | STATEMENT (nullable)
├── florist_id            UUID → florists.id (nullable, FLORIST role only)
├── stripe_customer_id    String (nullable)
├── stripe_subscription_id String (nullable)
├── skip_next_delivery    Boolean (default false)
├── email_notifications_enabled Boolean (default true)
└── created_at            DateTime
```

**Status transitions:**
- `CREATED` → Account exists, no subscription activated
- `ACTIVE` → Subscription active, deliveries scheduled
- `PAUSED` → Subscription paused, no new deliveries

---

### Properties

```
Property
├── id                    UUID (PK)
├── name                  String
├── address               String
├── status                CREATED | PENDING_FLORIST | PENDING_PM | ACTIVE | ARCHIVED
├── delivery_cadence      String (e.g. "weekly", "bi-weekly", "monthly")
├── next_delivery_date    DateTime (nullable)
├── delivery_lead_days    Integer (default 3)
├── property_manager_id   UUID → users.id (nullable, in-memory ref)
├── created_at            DateTime
└── updated_at            DateTime
```

**Status is computed from assignments:**
```
has_florist AND has_pm  → ACTIVE
has_florist only        → PENDING_PM
has_pm only             → PENDING_FLORIST
neither                 → CREATED
```

---

### Florists

```
Florist
├── id          UUID (PK)
├── name        String
├── status      ONBOARDING | READY | ARCHIVED
├── created_at  DateTime
```

A florist must be `READY` before being assigned to a property.

---

### PropertyAssignments

```
PropertyAssignment
├── id           UUID (PK)
├── property_id  UUID → properties.id (CASCADE)
├── florist_id   UUID → florists.id (CASCADE)
├── active       Boolean
└── created_at   DateTime

Constraint: unique partial index on (property_id) WHERE active = true
→ Only one active florist per property at a time
```

---

### Deliveries

```
Delivery
├── id                UUID (PK)
├── user_id           UUID (in-memory ref, no FK)
├── property_id       UUID → properties.id
├── subscription_plan ESSENTIAL | SIGNATURE | STATEMENT
├── status            SCHEDULED | DELIVERED | SKIPPED | MISSED
├── scheduled_for     DateTime
├── delivered_at      DateTime (nullable)
├── created_at        DateTime
├── updated_at        DateTime
└── archived_at       DateTime (nullable)
```

**Status transitions:**
```
SCHEDULED → DELIVERED  (florist marks complete)
SCHEDULED → MISSED     (florist marks failed)
SCHEDULED → SKIPPED    (customer skips)
```

---

### Payments

```
Payment
├── id                          UUID (PK)
├── user_id                     UUID (in-memory ref, no FK)
├── property_id                 UUID → properties.id (nullable)
├── stripe_payment_intent_id    String (unique, nullable)
├── amount_cents                Integer
├── currency                    String (default "usd")
├── status                      PENDING | SUCCEEDED | FAILED | REFUNDED
├── subscription_plan           String (nullable)
└── created_at                  DateTime

Invoice
├── id                  UUID (PK)
├── user_id             UUID (in-memory ref, no FK)
├── stripe_invoice_id   String (unique, nullable)
├── amount_cents        Integer
├── currency            String
├── status              String
├── period_start        DateTime (nullable)
├── period_end          DateTime (nullable)
├── pdf_url             String (nullable)
└── created_at          DateTime

FloristPayout
├── id                  UUID (PK)
├── florist_id          UUID → florists.id
├── stripe_transfer_id  String (unique, nullable)
├── amount_cents        Integer
├── status              PENDING | COMPLETED | FAILED
├── period_start        DateTime (nullable)
├── period_end          DateTime (nullable)
└── created_at          DateTime
```

---

### Florist Shopify Integration

```
FloristConnection
├── id              UUID (PK)
├── florist_id      UUID → florists.id (CASCADE)
├── shop_domain     String (unique)
├── api_key_hash    String (unique) — SHA-256 of API key
├── connected_at    DateTime
├── last_sync_at    DateTime (nullable)
└── synced_count    Integer

FloristProduct
├── id                    UUID (PK)
├── connection_id         UUID → florist_connections.id (CASCADE)
├── shopify_product_id    String
├── shopify_variant_id    String
├── title                 String
├── price                 String
├── image_url             String (nullable)
├── inventory_quantity    Integer
├── status                String (default "active")
└── synced_at             DateTime

FloristTierMapping
├── id                  UUID (PK)
├── connection_id       UUID → florist_connections.id (CASCADE)
├── tier                ESSENTIAL | SIGNATURE | STATEMENT
├── shopify_product_id  String
├── product_title       String
├── product_price       String
└── mapped_at           DateTime

Constraint: unique (connection_id, tier) — one product per tier per florist
```

---

### Florist Availability

```
FloristAvailability
├── id                      UUID (PK)
├── florist_id              UUID → florists.id
├── day_of_week             Integer (0=Mon, 6=Sun)
├── max_deliveries_per_day  Integer (default 10)
├── is_available            Boolean (default true)
├── created_at              DateTime
└── updated_at              DateTime
```

---

### PM Preferences

```
PMPreference
├── id                      UUID (PK)
├── user_id                 UUID (unique, in-memory ref)
├── delivery_reminders      Boolean (default true)
├── participation_updates   Boolean (default true)
├── rewards_milestones      Boolean (default true)
├── created_at              DateTime
└── updated_at              DateTime
```

---

### Property Rewards

```
PropertyReward
├── id                  UUID (PK)
├── property_id         UUID → properties.id (unique)
├── tier                String (Bronze | Silver | Gold)
├── participation_rate  Numeric(5,2)
├── created_at          DateTime
└── updated_at          DateTime
```

Reward tiers are computed from participation rate:
- Bronze: < 30%
- Silver: 30–60%
- Gold: > 60%

---

### Webhook Events

```
WebhookEvent
├── id              UUID (PK)
├── source          String (stripe | shopify)
├── event_type      String
├── event_id        String (nullable, external dedup ID)
├── payload_hash    String (nullable, SHA-256)
├── status          String (received | processed | failed)
├── error_message   Text (nullable)
└── created_at      DateTime
```

---

## Subscription Plans

| Plan | Description |
|------|-------------|
| ESSENTIAL | Basic floral arrangement |
| SIGNATURE | Premium floral arrangement |
| STATEMENT | Luxury floral arrangement |

Pricing is managed in Stripe, not hardcoded in the API.

---

## Authentication

JWT-based auth with role claims:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "exp": 1234567890
}
```

- Tokens signed with `JWT_SECRET` (HS256)
- 7-day expiration
- Stored in localStorage on frontend
- `require_role()` FastAPI dependency enforces RBAC on all protected routes

Optional AWS Cognito integration available via `USE_COGNITO=true` feature flag.

---

## API Endpoints Summary

### Public
- `GET /health` — Basic health check
- `GET /health/db` — Database connectivity
- `GET /health/full` — Full system health
- `GET /properties` — List available properties
- `GET /public/faq` — FAQ content

### Auth
- `POST /auth/register` — Customer registration
- `POST /auth/login` — Login, returns JWT
- `GET /auth/me` — Current user (enriched)
- `POST /auth/dev/switch-role` — Dev only

### Customer (`/me/*`)
- `PATCH /me/property` — Set property + unit
- `PATCH /me/subscription` — Activate or pause
- `PATCH /me/plan` — Select plan tier
- `PATCH /me/skip-next-delivery` — Skip next cycle
- `GET /me/deliveries` — Delivery history
- `GET /me/notification-preferences`
- `PATCH /me/notification-preferences`

### Payments (`/payments/*`)
- `POST /payments/setup-intent` — Stripe SetupIntent
- `POST /payments/subscribe` — Create subscription
- `POST /payments/cancel` — Cancel subscription
- `GET /payments/payment-method`
- `PATCH /payments/payment-method`
- `GET /payments/invoices`

### Florist (`/florist/*`)
- `GET /florist/me` — Profile + assigned properties
- `GET /florist/deliveries` — Upcoming deliveries
- `PATCH /florist/deliveries/{id}` — Mark delivered/missed
- `GET /florist/availability`
- `PUT /florist/availability`

### Florist API (`/api/florists/*`) — Shopify app integration
- `POST /api/florists/validate-key`
- `GET /api/florists/connection-status`
- `POST /api/florists/disconnect`
- `POST /api/florists/products/sync`
- `GET /api/florists/products`
- `POST/GET/DELETE /api/florists/tier-mappings`
- `POST /api/florists/ready`
- `GET /api/florists/dashboard`
- `POST /api/florists/webhooks/products-update`
- `POST /api/florists/webhooks/products-delete`

### Property Manager (`/pm/*`)
- `GET /pm/stats` — Dashboard stats
- `GET /pm/residents` — Resident list with plan distribution
- `GET /pm/deliveries` — Paginated delivery history
- `GET /pm/rewards` — Reward tier and progress
- `GET /pm/settings`
- `PATCH /pm/settings`

### Admin (`/admin/*`)
- `GET/POST/PATCH/DELETE /admin/properties`
- `POST /admin/properties/{id}/assign-pm`
- `GET/POST/DELETE /admin/florists`
- `GET/POST/PATCH/DELETE /admin/users`
- `GET/POST /admin/property-assignments`
- `POST /admin/generate-deliveries`
- `POST /admin/payouts/generate`
- `GET /admin/payouts`

### Webhooks
- `POST /webhooks/stripe` — Stripe event handler

### Deliveries
- `POST /deliveries/photo-upload-url` — S3 presigned upload URL
- `GET /deliveries/photo-download-url` — S3 presigned download URL

---

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "request_id": "uuid"
  }
}
```

Common codes: `INVALID_CREDENTIALS`, `EMAIL_EXISTS`, `USER_NOT_FOUND`, `INVALID_PROPERTY`, `FORBIDDEN`, `NOT_FOUND`, `INVALID_STATE`

---

## Database Migrations

10 Alembic migrations (001–010):
1. Core tables (properties, florists, property_assignments)
2. Enhanced properties (status enum, property_manager_id)
3. Archived status
4. Deliveries table
5. Shopify integration tables (florist_connections, products, tier_mappings)
6. Delivery generation columns (next_delivery_date, delivery_lead_days)
7. PM dashboard tables (pm_preferences, property_rewards)
8. Payment tables (payments, invoices, florist_payouts)
9. Florist availability
10. Webhook events

---

## ⚠️ Migration Required: Users Table

The `users` table does not exist in PostgreSQL. Users are stored in a Python dict that resets on every API restart. This is the most critical gap before production use.

### What needs to be built

**Migration 011** — Create users table:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    property_id UUID REFERENCES properties(id),
    unit VARCHAR(50),
    subscription_status VARCHAR(20) DEFAULT 'CREATED',
    subscription_plan VARCHAR(20),
    florist_id UUID REFERENCES florists(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    skip_next_delivery BOOLEAN NOT NULL DEFAULT FALSE,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**What else changes:**
- Replace `db/users.py` in-memory store with SQLAlchemy ORM model
- Add FK constraints on `deliveries.user_id`, `payments.user_id`, `invoices.user_id`, `pm_preferences.user_id`
- Update all routes that call `get_user_by_email`, `get_user_by_id`, `create_user`, `update_user` to use DB session
- Migrate seed data to insert into the table

### Impact on existing data
- Any users created before this migration will be lost (expected — dev only)
- Stripe customer/subscription IDs will persist correctly after migration

---

## Environment Variables

### API (`apps/api/.env.local`)
```
JWT_SECRET=<openssl rand -hex 32>
ENVIRONMENT=development
DATABASE_URL=postgresql://user:password@host:5432/bloom
AWS_REGION=us-east-1
USE_COGNITO=false
USE_AWS_SECRETS=false
USE_CLOUDWATCH=false
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SES_FROM_EMAIL=noreply@bloom.com
S3_BUCKET_NAME=bloom-dev-delivery-photos
CORS_ORIGINS=http://localhost:5173
```

### Web (`apps/web/.env.local`)
```
VITE_API_BASE_URL=http://localhost:8000
```

---

## Local Development

```bash
# 1. Start Postgres
docker compose up -d

# 2. Install dependencies
pnpm install
cd apps/api && pip install -r requirements.txt

# 3. Run migrations
pnpm db:migrate

# 4. Start everything
pnpm dev
```

Dev users seeded automatically:
- `admin@bloom.example.com` / `bloom123`
- `florist@bloom.example.com` / `bloom123`
- `pm1@bloom.example.com` / `bloom123`
- `pm2@bloom.example.com` / `bloom123`
- `customer1–30@bloom.example.com` / `bloom123`

API docs: http://localhost:8000/docs

---

## Deployment

| Layer | Service |
|-------|---------|
| Frontend | AWS Amplify (auto-deploy from `main`) |
| Backend | AWS App Runner (ECR container) |
| Database | Amazon RDS PostgreSQL 15 |
| Scheduled jobs | AWS Lambda + EventBridge |
