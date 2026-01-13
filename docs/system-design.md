# Bloom Platform - System Design Document

## Overview

Bloom is a property-based floral subscription orchestration platform that connects properties, florists, and residents. The platform does NOT sell flowers or manage inventory - Shopify is the system of record for all products and pricing.

### Core Principles
- **Bloom does NOT sell flowers** - orchestration only
- **Shopify is the system of record** for products and pricing
- **One delivery cadence per property** (no per-resident customization)
- **Bloom controls florist assignment** (residents cannot choose florists)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + Vite)                        │
│                           AWS Amplify Hosting                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Customer   │  │   Property   │  │   Florist    │  │    Admin     │    │
│  │  Dashboard   │  │   Manager    │  │  Dashboard   │  │  Dashboard   │    │
│  │  /customer/* │  │    /pm/*     │  │  /florist/*  │  │   /admin/*   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (FastAPI + Python)                      │
│                              AWS App Runner                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  /auth/*     │  │  /admin/*    │  │  /florist/*  │  │   /me/*      │    │
│  │  /public/*   │  │  /pm/*       │  │  /customer/* │  │ /properties  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (PostgreSQL)                             │
│                              Amazon RDS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    users     │  │  properties  │  │   florists   │  │  deliveries  │    │
│  │  (in-memory) │  │              │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                    ┌──────────────────────────────────┐                     │
│                    │     property_assignments         │                     │
│                    └──────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## User Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **CUSTOMER** | Residents who subscribe to floral deliveries | Subscribe/unsubscribe, skip deliveries, upgrade orders, manage preferences |
| **PROPERTY_MANAGER** | Building/complex managers | View participation metrics, redeem rewards, view resident engagement |
| **FLORIST** | Flower vendors connected to Bloom | Connect Shopify store, fulfill deliveries, update delivery status |
| **ADMIN** | Bloom platform administrators | Manage properties, florists, users, assignments |

---

## Data Models

### User
```typescript
interface User {
  id: UUID;
  email: string;
  role: 'CUSTOMER' | 'PROPERTY_MANAGER' | 'FLORIST' | 'ADMIN';
  status: 'ACTIVE' | 'ARCHIVED';
  property_id: UUID | null;        // Associated property (for residents/PMs)
  unit: string | null;             // Unit number within property
  subscription_status: 'CREATED' | 'ACTIVE' | 'PAUSED' | null;
  subscription_plan: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT' | null;
  florist_id: UUID | null;         // Associated florist (for FLORIST role)
  created_at: datetime;
}
```

### Property
```typescript
interface Property {
  id: UUID;
  name: string;
  address: string;
  status: 'CREATED' | 'PENDING_FLORIST' | 'PENDING_PM' | 'ACTIVE' | 'ARCHIVED';
  delivery_cadence: string | null;
  property_manager_id: UUID | null;
  created_at: datetime;
  updated_at: datetime;
}
```

**Property Status Transitions (Computed):**
- `CREATED` → No florist, no PM assigned
- `PENDING_FLORIST` → Has PM, needs florist
- `PENDING_PM` → Has florist, needs PM
- `ACTIVE` → Has both florist and PM assigned
- `ARCHIVED` → Soft deleted

### Florist
```typescript
interface Florist {
  id: UUID;
  name: string;
  status: 'ONBOARDING' | 'READY' | 'ARCHIVED';
  created_at: datetime;
}
```

### PropertyAssignment
```typescript
interface PropertyAssignment {
  id: UUID;
  property_id: UUID;
  florist_id: UUID;
  active: boolean;
  created_at: datetime;
}
```
*Note: Only one active assignment per property (enforced by partial unique index)*

### Delivery
```typescript
interface Delivery {
  id: UUID;
  user_id: UUID;
  property_id: UUID;
  subscription_plan: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT';
  status: 'SCHEDULED' | 'DELIVERED' | 'SKIPPED' | 'MISSED';
  scheduled_for: datetime;
  delivered_at: datetime | null;
  created_at: datetime;
  updated_at: datetime;
  archived_at: datetime | null;
}
```

---

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register new customer account |
| POST | `/auth/login` | Public | Authenticate and get JWT |
| GET | `/auth/me` | JWT | Get current user with enriched property data |
| POST | `/auth/dev/switch-role` | Dev only | Switch role for testing |

### Admin (`/admin`) - ADMIN role only

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Properties** | | |
| POST | `/admin/properties` | Create new property |
| GET | `/admin/properties` | List all properties (enriched) |
| PATCH | `/admin/properties/{id}` | Update property |
| PATCH | `/admin/properties/{id}/assign-pm` | Assign property manager |
| DELETE | `/admin/properties/{id}` | Soft delete (archive) property |
| **Florists** | | |
| POST | `/admin/florists` | Create new florist |
| GET | `/admin/florists` | List all florists |
| DELETE | `/admin/florists/{id}` | Soft delete (archive) florist |
| **Assignments** | | |
| POST | `/admin/property-assignments` | Create property-florist assignment |
| GET | `/admin/property-assignments` | List all assignments |
| **Users** | | |
| GET | `/admin/users` | List all users (enriched) |
| POST | `/admin/users` | Create new user |
| PATCH | `/admin/users/{id}` | Update user |
| DELETE | `/admin/users/{id}` | Soft delete (archive) user |

### Customer Self-Service (`/me`) - CUSTOMER role only

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/me/property` | Assign property to self |
| PATCH | `/me/subscription` | Update subscription status (ACTIVE/PAUSED) |
| PATCH | `/me/plan` | Update subscription plan |
| GET | `/me/deliveries` | Get next delivery and history |

### Property Manager (`/pm`) - PROPERTY_MANAGER role only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pm/stats` | Get dashboard statistics |
| GET | `/pm/residents` | Get list of residents at property |

### Florist (`/florist`) - FLORIST role only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/florist/me` | Get florist profile with assigned properties |
| GET | `/florist/deliveries` | Get upcoming deliveries for assigned properties |
| PATCH | `/florist/deliveries/{id}` | Update delivery status (DELIVERED/MISSED) |

### Public Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/properties` | Public | List available properties for selection |
| GET | `/public/faq` | Public | Get FAQ content |
| GET | `/health` | Public | Basic health check |
| GET | `/health/db` | Public | Database connectivity check |

---

## Frontend Pages

### Customer Dashboard (`/customer/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/customer/home` | HomePage | Dashboard overview with subscription status |
| `/customer/subscription` | SubscriptionPage | Manage subscription plan |
| `/customer/deliveries` | DeliveriesPage | View upcoming and past deliveries |
| `/customer/account` | AccountPage | Account settings |
| `/customer/help` | HelpPage | FAQ and support |

### Property Manager Dashboard (`/pm/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/pm/overview` | OverviewPage | Property stats and metrics |
| `/pm/participation` | ParticipationPage | Resident participation details |
| `/pm/rewards` | RewardsPage | Property-level rewards |
| `/pm/settings` | SettingsPage | PM settings |

### Florist Dashboard (`/florist/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/florist/deliveries` | DeliveriesPage | Upcoming deliveries to fulfill |
| `/florist/products` | ProductsPage | Product mapping (Shopify integration) |
| `/florist/availability` | AvailabilityPage | Availability settings |
| `/florist/settings` | SettingsPage | Florist settings and onboarding |

### Admin Dashboard (`/admin/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/admin/properties` | PropertiesPage | Manage properties |
| `/admin/florists` | FloristsPage | Manage florists |
| `/admin/users` | UsersPage | Manage users |

### Onboarding Flow (`/onboarding/*`)

| Route | Page | Description |
|-------|------|-------------|
| `/onboarding/register` | RegisterPage | Customer registration |
| `/onboarding/property` | PropertyPage | Property selection |
| `/onboarding/subscription` | SubscriptionPage | Plan selection |

### Other Pages

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | User authentication |
| `/unauthorized` | UnauthorizedPage | Access denied |

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "exp": 1234567890
}
```

### Role-Based Access Control (RBAC)
- All protected endpoints validate JWT token
- Role is extracted from token and validated against endpoint requirements
- Server-side role validation on all protected endpoints

### Route Protection
- Frontend routes are protected by role-based guards
- Each role has a dedicated namespace (`/customer/*`, `/pm/*`, `/florist/*`, `/admin/*`)
- Unauthorized access redirects to `/unauthorized`

---

## Subscription Plans

| Plan | Description |
|------|-------------|
| **ESSENTIAL** | Basic floral arrangement |
| **SIGNATURE** | Premium floral arrangement |
| **STATEMENT** | Luxury floral arrangement |

---

## Delivery Status Lifecycle

```
SCHEDULED → DELIVERED (success)
         → SKIPPED (customer choice)
         → MISSED (delivery failed)
```

---

## Key Business Rules

1. **One florist per property** - Only one active assignment allowed
2. **Property status is computed** - Based on florist and PM assignments
3. **Customers cannot choose florists** - Bloom controls assignments
4. **One delivery cadence per property** - No per-resident customization
5. **Soft delete pattern** - Entities are archived, not deleted
6. **Shopify is source of truth** - For products and pricing

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Frontend Hosting | AWS Amplify |
| Backend | FastAPI (Python) |
| Backend Hosting | AWS App Runner |
| Database | PostgreSQL (Amazon RDS) |
| Authentication | JWT tokens |
| Migrations | Alembic |

---

## Environment Configuration

| Environment | Purpose |
|-------------|---------|
| `development` | Local development with dev-only endpoints |
| `production` | Live traffic |

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

Common error codes:
- `INVALID_CREDENTIALS` - Authentication failed
- `EMAIL_EXISTS` - Duplicate email on registration
- `USER_NOT_FOUND` - User not found
- `INVALID_PROPERTY` - Property validation failed
- `FORBIDDEN` - Access denied
- `NOT_FOUND` - Resource not found
- `INVALID_STATE` - Invalid state transition
