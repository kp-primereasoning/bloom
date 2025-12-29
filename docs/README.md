# Bloom Documentation

This directory contains documentation for the Bloom platform.

## Contents

- Architecture decisions (coming soon)
- API documentation (coming soon)
- User guides (coming soon)

## Core Data Model

Bloom's core domain consists of three entities that enable property-florist orchestration.

### Entity Relationship

```
┌─────────────┐         ┌─────────────────────┐         ┌─────────────┐
│  Property   │ 1     * │ PropertyAssignment  │ *     1 │   Florist   │
│─────────────│─────────│─────────────────────│─────────│─────────────│
│ id (uuid)   │         │ id (uuid)           │         │ id (uuid)   │
│ name        │         │ property_id (fk)    │         │ name        │
│ address     │         │ florist_id (fk)     │         │ status      │
│ status      │         │ active              │         │ created_at  │
│ delivery_   │         │ created_at          │         └─────────────┘
│   cadence   │         └─────────────────────┘
│ created_at  │
│ updated_at  │
└─────────────┘
```

### Properties

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Property name |
| address | VARCHAR(500) | Property address |
| status | ENUM | DRAFT → SUBMITTED → ACTIVE |
| delivery_cadence | VARCHAR(100) | Delivery schedule (nullable) |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Florists

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Florist business name |
| status | ENUM | ONBOARDING → READY |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Property Assignments

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| property_id | UUID | FK to properties |
| florist_id | UUID | FK to florists |
| active | BOOLEAN | Only one active per property |
| created_at | TIMESTAMPTZ | Creation timestamp |

### Business Rules

1. Properties start in DRAFT status
2. DRAFT → SUBMITTED is always allowed
3. SUBMITTED → ACTIVE requires an active florist assignment
4. Only one active assignment per property at a time
5. Creating a new assignment deactivates the previous one

### Database

- Engine: PostgreSQL 15
- Migrations: Alembic
- UUID generation: pgcrypto extension
