# Bloom Schema Definition

> **Maintained alongside `apps/api/models/`.**
> When you add or change a model, update this file in the same PR.

---

## Notes

- **`users` is a database table** (migration 011). Fields referencing `user_id` in other tables are still logical references with no FK constraint (deliveries, payments, invoices, pm_preferences).
- All primary keys are `UUID`.
- Soft deletes are used throughout — records are archived, not dropped.
- Stripe IDs are stored as plain strings (never card numbers or secrets).

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        uuid        id                          PK
        string      email                       UNIQUE
        string      hashed_password
        string      role                        "CUSTOMER|PROPERTY_MANAGER|FLORIST|ADMIN"
        string      status                      "ACTIVE|ARCHIVED"
        uuid        property_id                 FK
        string      unit
        string      subscription_status         "CREATED|ACTIVE|PAUSED"
        string      subscription_plan           "ESSENTIAL|SIGNATURE|STATEMENT"
        uuid        florist_id                  FK
        string      stripe_customer_id
        string      stripe_subscription_id
        bool        skip_next_delivery
        bool        email_notifications_enabled
        string      cognito_sub                 UNIQUE
        timestamp   created_at
    }

    properties {
        uuid        id              PK
        string      name
        string      address
        string      status
        string      delivery_cadence
        timestamp   next_delivery_date
        int         delivery_lead_days
        uuid        property_manager_id     "in-memory user ref (no FK)"
        timestamp   created_at
        timestamp   updated_at
    }

    florists {
        uuid        id              PK
        string      name
        string      status
        timestamp   created_at
    }

    property_assignments {
        uuid        id              PK
        uuid        property_id     FK
        uuid        florist_id      FK
        bool        active
        timestamp   created_at
    }

    deliveries {
        uuid        id              PK
        uuid        user_id         "in-memory user ref (no FK)"
        uuid        property_id     FK
        string      subscription_plan
        string      status
        timestamp   scheduled_for
        timestamp   delivered_at
        timestamp   created_at
        timestamp   updated_at
        timestamp   archived_at
    }

    florist_availability {
        uuid        id              PK
        uuid        florist_id      FK
        int         day_of_week     "0=Mon 6=Sun"
        int         max_deliveries_per_day
        bool        is_available
        timestamp   created_at
        timestamp   updated_at
    }

    florist_connections {
        uuid        id              PK
        uuid        florist_id      FK
        string      shop_domain     UNIQUE
        string      api_key_hash    UNIQUE
        timestamp   connected_at
        timestamp   last_sync_at
        int         synced_count
    }

    florist_products {
        uuid        id              PK
        uuid        connection_id   FK
        string      shopify_product_id
        string      shopify_variant_id
        string      title
        string      price
        string      image_url
        int         inventory_quantity
        string      status
        timestamp   synced_at
    }

    florist_tier_mappings {
        uuid        id              PK
        uuid        connection_id   FK
        string      tier            "ESSENTIAL|SIGNATURE|STATEMENT"
        string      shopify_product_id
        string      product_title
        string      product_price
        timestamp   mapped_at
    }

    payments {
        uuid        id              PK
        uuid        user_id         "in-memory user ref (no FK)"
        uuid        property_id     FK
        string      stripe_payment_intent_id    UNIQUE
        int         amount_cents
        string      currency
        string      status
        string      subscription_plan
        timestamp   created_at
    }

    invoices {
        uuid        id              PK
        uuid        user_id         "in-memory user ref (no FK)"
        string      stripe_invoice_id   UNIQUE
        int         amount_cents
        string      currency
        string      status
        timestamp   period_start
        timestamp   period_end
        string      pdf_url
        timestamp   created_at
    }

    florist_payouts {
        uuid        id              PK
        uuid        florist_id      FK
        string      stripe_transfer_id  UNIQUE
        int         amount_cents
        string      status
        timestamp   period_start
        timestamp   period_end
        timestamp   created_at
    }

    property_rewards {
        uuid        id              PK
        uuid        property_id     FK  UNIQUE
        string      tier            "Bronze|Silver|Gold"
        decimal     participation_rate
        timestamp   created_at
        timestamp   updated_at
    }

    pm_preferences {
        uuid        id              PK
        uuid        user_id         UNIQUE  "in-memory user ref (no FK)"
        bool        delivery_reminders
        bool        participation_updates
        bool        rewards_milestones
        timestamp   created_at
        timestamp   updated_at
    }

    webhook_events {
        uuid        id              PK
        string      source          "stripe|shopify"
        string      event_type
        string      event_id
        string      payload_hash    "SHA-256"
        string      status          "received|processed|failed"
        text        error_message
        timestamp   created_at
    }

    users                }o--o| properties             : "lives in"
    users                }o--o| florists               : "assigned to"

    properties           ||--o{ property_assignments  : "assigned florist"
    florists             ||--o{ property_assignments  : "assigned to"
    properties           ||--o{ deliveries            : "delivers to"
    properties           ||--o| property_rewards      : "reward tier"
    florists             ||--o{ florist_availability  : "availability"
    florists             ||--o{ florist_connections   : "shopify connection"
    florists             ||--o{ florist_payouts       : "payouts"
    florist_connections  ||--o{ florist_products      : "synced products"
    florist_connections  ||--o{ florist_tier_mappings : "tier mappings"
    properties           ||--o{ payments              : "charges"
```

---

## Tables

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| email | varchar(255) | NOT NULL, UNIQUE | Stored lowercase |
| hashed_password | varchar(255) | NOT NULL | bcrypt |
| role | enum | NOT NULL | CUSTOMER \| PROPERTY_MANAGER \| FLORIST \| ADMIN |
| status | enum | NOT NULL, default ACTIVE | ACTIVE \| ARCHIVED |
| property_id | uuid | FK → properties.id SET NULL | Null for non-customers |
| unit | varchar(50) | | Apartment/unit number |
| subscription_status | enum | NOT NULL, default CREATED | CREATED \| ACTIVE \| PAUSED |
| subscription_plan | enum | | ESSENTIAL \| SIGNATURE \| STATEMENT |
| florist_id | uuid | FK → florists.id SET NULL | Which florist serves this customer |
| stripe_customer_id | varchar(255) | | Stripe cus_… ID |
| stripe_subscription_id | varchar(255) | | Stripe sub_… ID |
| skip_next_delivery | bool | NOT NULL, default false | |
| email_notifications_enabled | bool | NOT NULL, default true | |
| cognito_sub | varchar(255) | UNIQUE | AWS Cognito user sub |
| created_at | timestamptz | | |

---

### `properties`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | |
| address | varchar(500) | NOT NULL | |
| status | enum | NOT NULL | See enums |
| delivery_cadence | varchar(100) | | e.g. `"weekly"` |
| next_delivery_date | timestamptz | | Set by delivery gen service |
| delivery_lead_days | int | NOT NULL, default 3 | Days ahead to generate deliveries |
| property_manager_id | uuid | | Logical ref to in-memory User |
| created_at | timestamptz | NOT NULL | |
| updated_at | timestamptz | NOT NULL | |

---

### `florists`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| name | varchar(255) | NOT NULL | |
| status | enum | NOT NULL, default ONBOARDING | See enums |
| created_at | timestamptz | NOT NULL | |

---

### `property_assignments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| property_id | uuid | FK → properties.id CASCADE | |
| florist_id | uuid | FK → florists.id CASCADE | |
| active | bool | NOT NULL, default true | |
| created_at | timestamptz | NOT NULL | |

**Indexes:** Partial unique index on `(property_id) WHERE active = true` — enforces one active florist per property.

---

### `deliveries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | NOT NULL | In-memory user ref — no FK |
| property_id | uuid | FK → properties.id | |
| subscription_plan | enum | NOT NULL | See enums |
| status | enum | NOT NULL, default SCHEDULED | See enums |
| scheduled_for | timestamptz | NOT NULL | |
| delivered_at | timestamptz | | Set when florist marks delivered |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |
| archived_at | timestamptz | | Soft delete |

---

### `florist_availability`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| florist_id | uuid | FK → florists.id | |
| day_of_week | int | NOT NULL | 0=Mon, 6=Sun |
| max_deliveries_per_day | int | NOT NULL, default 10 | |
| is_available | bool | NOT NULL, default true | |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

**Indexes:** Unique on `(florist_id, day_of_week)`.

---

### `florist_connections`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| florist_id | uuid | FK → florists.id CASCADE | |
| shop_domain | varchar(255) | UNIQUE | e.g. `shop.myshopify.com` |
| api_key_hash | varchar(128) | UNIQUE | SHA-256 of API key |
| connected_at | timestamptz | | |
| last_sync_at | timestamptz | | |
| synced_count | int | NOT NULL, default 0 | |

---

### `florist_products`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| connection_id | uuid | FK → florist_connections.id CASCADE | |
| shopify_product_id | varchar(64) | NOT NULL | Shopify GID |
| shopify_variant_id | varchar(64) | NOT NULL | |
| title | varchar(500) | NOT NULL | |
| price | varchar(20) | NOT NULL | String to avoid rounding |
| image_url | varchar(2048) | | |
| inventory_quantity | int | NOT NULL, default 0 | |
| status | varchar(20) | NOT NULL, default active | |
| synced_at | timestamptz | | |

---

### `florist_tier_mappings`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| connection_id | uuid | FK → florist_connections.id CASCADE | |
| tier | varchar(20) | NOT NULL | ESSENTIAL \| SIGNATURE \| STATEMENT |
| shopify_product_id | varchar(64) | NOT NULL | |
| product_title | varchar(500) | NOT NULL | |
| product_price | varchar(20) | NOT NULL | |
| mapped_at | timestamptz | | |

**Constraints:** Unique on `(connection_id, tier)` — one product per tier per florist.

---

### `payments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | NOT NULL | In-memory user ref — no FK |
| property_id | uuid | FK → properties.id | |
| stripe_payment_intent_id | varchar(255) | UNIQUE | |
| amount_cents | int | NOT NULL | |
| currency | varchar(3) | NOT NULL, default usd | |
| status | enum | NOT NULL, default PENDING | See enums |
| subscription_plan | varchar(20) | | Snapshot at time of charge |
| created_at | timestamptz | | |

---

### `invoices`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | NOT NULL | In-memory user ref — no FK |
| stripe_invoice_id | varchar(255) | UNIQUE | |
| amount_cents | int | NOT NULL | |
| currency | varchar(3) | NOT NULL, default usd | |
| status | varchar(50) | NOT NULL | Mirrors Stripe invoice status |
| period_start | timestamptz | | |
| period_end | timestamptz | | |
| pdf_url | varchar(1000) | | |
| created_at | timestamptz | | |

---

### `florist_payouts`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| florist_id | uuid | FK → florists.id | |
| stripe_transfer_id | varchar(255) | UNIQUE | |
| amount_cents | int | NOT NULL | |
| status | enum | NOT NULL, default PENDING | See enums |
| period_start | timestamptz | | |
| period_end | timestamptz | | |
| created_at | timestamptz | | |

---

### `property_rewards`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| property_id | uuid | FK → properties.id, UNIQUE | One record per property |
| tier | varchar(10) | NOT NULL, default Bronze | Bronze \| Silver \| Gold |
| participation_rate | numeric(5,2) | NOT NULL, default 0 | 0.00–100.00 |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

---

### `pm_preferences`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| user_id | uuid | UNIQUE | In-memory user ref — no FK |
| delivery_reminders | bool | NOT NULL, default true | |
| participation_updates | bool | NOT NULL, default true | |
| rewards_milestones | bool | NOT NULL, default true | |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |

---

### `webhook_events`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK | |
| source | varchar(50) | NOT NULL | `stripe` or `shopify` |
| event_type | varchar(100) | NOT NULL | e.g. `invoice.payment_succeeded` |
| event_id | varchar(255) | | External ID for deduplication |
| payload_hash | varchar(64) | | SHA-256 of raw payload |
| status | varchar(20) | NOT NULL, default received | received \| processed \| failed |
| error_message | text | | Set on failure |
| created_at | timestamptz | | |

---

## Enums

### `propertystatus_v2`
| Value | Meaning |
|-------|---------|
| `CREATED` | No florist, no PM assigned |
| `PENDING_FLORIST` | PM assigned, florist missing |
| `PENDING_PM` | Florist assigned, PM missing |
| `ACTIVE` | Both assigned — deliveries can be generated |
| `ARCHIVED` | Soft deleted |

### `floriststatus`
| Value | Meaning |
|-------|---------|
| `ONBOARDING` | Account created, Shopify not yet connected |
| `READY` | Shopify connected, can be assigned to properties |
| `ARCHIVED` | Soft deleted |

### `deliverystatus`
| Value | Meaning |
|-------|---------|
| `SCHEDULED` | Planned for a future date |
| `DELIVERED` | Florist marked complete |
| `SKIPPED` | Customer skipped this cycle |
| `MISSED` | Florist attempted, not completed |

### `subscriptionplan`
| Value | Price | Cadence |
|-------|-------|---------|
| `ESSENTIAL` | $75/mo | Every 2 weeks |
| `SIGNATURE` | $100/mo | Every 2 weeks |
| `STATEMENT` | $125/mo | Every 2 weeks |

### `paymentstatus`
`PENDING` → `SUCCEEDED` / `FAILED` / `REFUNDED`

### `payoutstatus`
`PENDING` → `COMPLETED` / `FAILED`

---

## What's NOT in the database

| Thing | Where it lives |
|-------|---------------|
| Shopify access tokens | AWS Secrets Manager |
| Stripe secret keys | AWS Secrets Manager |
| Delivery photos | S3 (`bloom-delivery-photos-{account}`) |
| JWT secrets | AWS Secrets Manager |
