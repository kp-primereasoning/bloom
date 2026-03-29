# Implementation Plan: Production Ready

## Overview

Migrate users from in-memory Python dict to PostgreSQL. This is the critical blocker for production. All tasks are sequential — each depends on the previous.

---

## Tasks

- [ ] 1. Create users SQLAlchemy ORM model
  - [ ] 1.1 Rewrite `apps/api/models/user.py` as a SQLAlchemy ORM model
    - Add `from db.database import Base` import
    - Define `User(Base)` with `__tablename__ = "users"`
    - Add all columns: id, email, hashed_password, role, status, property_id, unit, subscription_status, subscription_plan, florist_id, stripe_customer_id, stripe_subscription_id, skip_next_delivery, email_notifications_enabled, created_at, updated_at
    - Use `SQLEnum` for role, status, subscription_status, subscription_plan
    - Keep `UserResponse` Pydantic model for API responses
    - _Requirements: 1.1, 1.6_
  - [ ] 1.2 Register User model in `models/__init__.py`
    - Import User so Alembic can detect it
    - _Requirements: 1.1_

- [ ] 2. Write Alembic migration 011 — create users table
  - [ ] 2.1 Create `apps/api/alembic/versions/20260329_0001_011_create_users_table.py`
    - Create `users` table with all columns
    - Add unique constraint on email
    - Add indexes on email, role, property_id
    - _Requirements: 1.1, 1.5, 1.6_
  - [ ] 2.2 Run migration locally and verify table exists
    - `alembic upgrade head`
    - Confirm `users` table in psql
    - _Requirements: 1.1_

- [ ] 3. Write Alembic migration 012 — add FK constraints
  - [ ] 3.1 Create `apps/api/alembic/versions/20260329_0002_012_add_user_fk_constraints.py`
    - Add FK on `deliveries.user_id` → `users.id` ON DELETE RESTRICT
    - Add FK on `payments.user_id` → `users.id` ON DELETE RESTRICT
    - Add FK on `invoices.user_id` → `users.id` ON DELETE RESTRICT
    - Add FK on `pm_preferences.user_id` → `users.id` ON DELETE CASCADE
    - Add FK on `properties.property_manager_id` → `users.id` ON DELETE SET NULL
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.3_
  - [ ] 3.2 Run migration locally and verify constraints
    - _Requirements: 3.1–3.5_

- [ ] 4. Replace in-memory user store with DB-backed functions
  - [ ] 4.1 Rewrite `apps/api/db/users.py`
    - Replace `_users: dict` with SQLAlchemy queries
    - Update `get_user_by_email(email, db)` to query users table
    - Update `get_user_by_id(user_id, db)` to query users table
    - Update `create_user(user_data, db)` to insert into users table
    - Update `update_user(user_id, updates, db)` to update users table
    - Update `get_all_users(db, include_archived)` to query users table
    - Update `archive_user(user_id, db)` to set status=ARCHIVED in DB
    - Remove `clear_users()` and `user_count()` or update them
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [ ] 5. Update auth routes to use DB
  - [ ] 5.1 Update `apps/api/routes/auth.py`
    - Add `db: Session = Depends(get_db)` to register, login, me endpoints
    - Pass `db` to all `db/users.py` function calls
    - Update register to use `db.add(user)` / `db.commit()` pattern
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ] 5.2 Update `apps/api/auth/service.py`
    - Update `authenticate_user` to accept and pass DB session
    - _Requirements: 6.2_

- [ ] 6. Update /me routes to use DB
  - [ ] 6.1 Update `apps/api/routes/me.py`
    - Add `db: Session = Depends(get_db)` to all endpoints
    - Pass `db` to user lookup and update calls
    - Ensure `PATCH /me/property`, `/me/subscription`, `/me/plan`, `/me/skip-next-delivery` all persist to DB
    - _Requirements: 6.4, 6.5, 6.6_

- [ ] 7. Update admin user routes to use DB
  - [ ] 7.1 Update `apps/api/routes/admin.py` user endpoints
    - `GET /admin/users` — query from DB
    - `POST /admin/users` — insert to DB
    - `PATCH /admin/users/{id}` — update in DB
    - `DELETE /admin/users/{id}` — archive in DB
    - _Requirements: 6.7, 6.8, 6.9_

- [ ] 8. Update florist and PM routes to use DB
  - [ ] 8.1 Update `apps/api/routes/florist.py`
    - `GET /florist/me` — look up user from DB to get florist_id
    - _Requirements: 7.3_
  - [ ] 8.2 Update `apps/api/routes/pm.py`
    - PM stats and residents — look up users from DB
    - _Requirements: 7.5_

- [ ] 9. Update payments routes to use DB
  - [ ] 9.1 Update `apps/api/routes/payments.py` and `apps/api/services/payments.py`
    - Read `stripe_customer_id` from DB user record
    - Write `stripe_customer_id` and `stripe_subscription_id` back to DB after Stripe calls
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 10. Update seed to write users to DB
  - [ ] 10.1 Rewrite user seeding in `apps/api/db/seed.py`
    - Replace `_users[email] = user` with `db.add(user)` / `db.commit()`
    - Check for existing users via `db.query(User).filter_by(email=...).first()`
    - Keep all other seed logic (properties, florists, assignments, deliveries) unchanged
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Run full test suite and fix failures
  - [ ] 11.1 Run `pytest` in `apps/api`
    - Fix any test failures caused by the migration
    - Tests that mock `_users` dict need to be updated to use DB fixtures
    - _Requirements: 7.1_
  - [ ] 11.2 Manually test end-to-end flows
    - Customer: register → login → select property → activate subscription → view deliveries
    - Admin: create user → assign PM → view users list
    - Florist: login → view deliveries → mark delivered
    - PM: login → view dashboard
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [ ] 12. Verify Stripe flow works with persisted IDs
  - [ ] 12.1 Test subscription activation end-to-end
    - Register customer → add payment method → activate subscription
    - Restart API
    - Verify stripe_customer_id and stripe_subscription_id still present
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 13. Commit and push
  - [ ] 13.1 Commit all changes with message `feat: migrate users to PostgreSQL (migration 011-012)`
  - [ ] 13.2 Push to main — triggers Amplify build for landing, App Runner deploy for API
  - [ ] 13.3 Run migrations on production RDS: `alembic upgrade head`
  - [ ] 13.4 Verify `/health/db` returns healthy on production

- [ ] 14. Update changelog
  - Add entry: users migrated to PostgreSQL, FK constraints added, Stripe IDs persisted
