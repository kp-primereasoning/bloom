# Requirements: Production Ready

## Introduction

The Bloom platform has a fully-featured codebase but cannot run reliably in production due to one critical architectural gap: users are stored in an in-memory Python dict that resets on every API restart. This spec covers migrating users to PostgreSQL and the downstream fixes required to make the platform production-stable.

This is not a feature spec — it is a correctness spec. Nothing here adds new functionality. Everything here makes existing functionality actually work.

## Glossary

- **In-memory store** — `db/users.py`, a Python dict that holds all user records at runtime
- **Users table** — The PostgreSQL table that will replace the in-memory store
- **Migration 011** — The Alembic migration that creates the users table
- **FK constraint** — Foreign key constraint linking child records to a parent users row
- **Stripe IDs** — `stripe_customer_id` and `stripe_subscription_id` stored on the user record

---

## Requirements

### Requirement 1: Users Persisted to PostgreSQL

**User Story:** As a platform operator, I want user accounts to survive API restarts, so that customers don't lose their accounts and subscriptions every time the service redeploys.

#### Acceptance Criteria

1. WHEN the API starts, THE users table SHALL exist in PostgreSQL with all required columns
2. WHEN a user registers, THE user record SHALL be written to the users table
3. WHEN the API restarts, THE user records SHALL still exist and be queryable
4. WHEN a user logs in, THE API SHALL look up the user from the database, not from memory
5. THE users table SHALL have a unique constraint on the email column
6. THE users table SHALL store: id, email, hashed_password, role, status, property_id, unit, subscription_status, subscription_plan, florist_id, stripe_customer_id, stripe_subscription_id, skip_next_delivery, email_notifications_enabled, created_at, updated_at

---

### Requirement 2: Stripe IDs Survive Restarts

**User Story:** As a customer, I want my payment method and subscription to remain linked to my account after the API restarts, so that I am not charged again or lose access to my subscription.

#### Acceptance Criteria

1. WHEN a Stripe customer is created for a user, THE stripe_customer_id SHALL be persisted to the users table
2. WHEN a Stripe subscription is created for a user, THE stripe_subscription_id SHALL be persisted to the users table
3. WHEN the API restarts, THE stripe_customer_id and stripe_subscription_id SHALL still be present on the user record
4. WHEN the payments service looks up a user's Stripe customer ID, IT SHALL read from the database

---

### Requirement 3: Referential Integrity for User-Linked Records

**User Story:** As a developer, I want database-level constraints between users and their related records, so that orphaned deliveries, payments, and preferences cannot exist.

#### Acceptance Criteria

1. THE deliveries table SHALL have a foreign key on user_id referencing users.id
2. THE payments table SHALL have a foreign key on user_id referencing users.id
3. THE invoices table SHALL have a foreign key on user_id referencing users.id
4. THE pm_preferences table SHALL have a foreign key on user_id referencing users.id
5. WHEN a user is archived, THE FK constraints SHALL use ON DELETE RESTRICT or SET NULL as appropriate (not CASCADE — preserve financial records)

---

### Requirement 4: Property Manager Assignment Uses DB

**User Story:** As an admin, I want property manager assignments to reference real database records, so that the property_manager_id on a property is always valid.

#### Acceptance Criteria

1. WHEN a PM is assigned to a property, THE property_manager_id SHALL reference a row in the users table
2. WHEN listing properties, THE API SHALL be able to JOIN to the users table to resolve the PM's email
3. THE properties.property_manager_id column SHALL have a foreign key referencing users.id

---

### Requirement 5: Seed Data Written to Database

**User Story:** As a developer, I want seed data to be written to the database, so that it persists across restarts and reflects the real data model.

#### Acceptance Criteria

1. WHEN the seed script runs, ALL user records SHALL be inserted into the users table
2. WHEN the seed script runs again, IT SHALL be idempotent (no duplicate users)
3. THE seed SHALL create the same dev users as before: admin, florist, 2 PMs, 30 customers
4. THE seed SHALL continue to create properties, florists, assignments, and deliveries as before

---

### Requirement 6: All Auth Routes Use Database

**User Story:** As a developer, I want all authentication and user management routes to read and write from the database, so that the system behaves consistently.

#### Acceptance Criteria

1. WHEN `POST /auth/register` is called, THE user SHALL be created in the database
2. WHEN `POST /auth/login` is called, THE user SHALL be looked up from the database
3. WHEN `GET /auth/me` is called, THE user SHALL be fetched from the database
4. WHEN `PATCH /me/property` is called, THE user record SHALL be updated in the database
5. WHEN `PATCH /me/subscription` is called, THE user record SHALL be updated in the database
6. WHEN `PATCH /me/plan` is called, THE user record SHALL be updated in the database
7. WHEN `GET /admin/users` is called, THE users SHALL be fetched from the database
8. WHEN `POST /admin/users` is called, THE user SHALL be created in the database
9. WHEN `PATCH /admin/users/{id}` is called, THE user SHALL be updated in the database

---

### Requirement 7: No Regression on Existing Functionality

**User Story:** As a developer, I want all existing features to continue working after the migration, so that the migration does not break anything.

#### Acceptance Criteria

1. WHEN the migration is complete, ALL existing API tests SHALL pass
2. WHEN the migration is complete, THE customer onboarding flow SHALL work end-to-end
3. WHEN the migration is complete, THE florist delivery flow SHALL work end-to-end
4. WHEN the migration is complete, THE admin user management SHALL work end-to-end
5. WHEN the migration is complete, THE PM dashboard SHALL work end-to-end
6. WHEN the migration is complete, THE Stripe payment flow SHALL work end-to-end
