# Design: Production Ready

## Problem

Users are stored in `db/users.py` — a Python dict in memory. Every API restart wipes all users. This means:

- Customers lose their accounts on every deploy
- Stripe customer/subscription IDs are lost — customers get re-billed or lose access
- No SQL joins between users and deliveries/payments/preferences
- `properties.property_manager_id` points to a ghost record
- The platform cannot be used in production

## Approach

Replace the in-memory user store with a proper SQLAlchemy ORM model backed by PostgreSQL. This is a pure refactor — no new features, no API contract changes. The goal is to make the existing code actually work.

---

## Database Changes

### Migration 011 — Create users table

```sql
CREATE TABLE users (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                       VARCHAR(255) NOT NULL,
    hashed_password             VARCHAR(255) NOT NULL,
    role                        VARCHAR(30) NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    property_id                 UUID REFERENCES properties(id) ON DELETE SET NULL,
    unit                        VARCHAR(50),
    subscription_status         VARCHAR(20) DEFAULT 'CREATED',
    subscription_plan           VARCHAR(20),
    florist_id                  UUID REFERENCES florists(id) ON DELETE SET NULL,
    stripe_customer_id          VARCHAR(255),
    stripe_subscription_id      VARCHAR(255),
    skip_next_delivery          BOOLEAN NOT NULL DEFAULT FALSE,
    email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_property_id ON users(property_id);
```

### Migration 012 — Add FK constraints to user-linked tables

```sql
-- deliveries
ALTER TABLE deliveries
    ADD CONSTRAINT fk_deliveries_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- payments
ALTER TABLE payments
    ADD CONSTRAINT fk_payments_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- invoices
ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

-- pm_preferences
ALTER TABLE pm_preferences
    ADD CONSTRAINT fk_pm_preferences_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- properties (property_manager_id)
ALTER TABLE properties
    ADD CONSTRAINT fk_properties_pm
    FOREIGN KEY (property_manager_id) REFERENCES users(id) ON DELETE SET NULL;
```

Note: `ON DELETE RESTRICT` on financial records (deliveries, payments, invoices) — we never want to lose these. `ON DELETE CASCADE` on preferences — safe to remove when user is removed. `ON DELETE SET NULL` on property PM assignment — property stays, just loses its PM.

---

## Code Changes

### 1. New SQLAlchemy model: `models/user.py`

Replace the Pydantic-only model with a full SQLAlchemy ORM model (same pattern as `models/property.py`). Keep the Pydantic `UserResponse` for API responses.

```python
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole, name="userrole"), nullable=False)
    status = Column(SQLEnum(UserStatus, name="userstatus"), nullable=False, default=UserStatus.ACTIVE)
    property_id = Column(UUID(as_uuid=True), ForeignKey("properties.id"), nullable=True)
    unit = Column(String(50), nullable=True)
    subscription_status = Column(SQLEnum(SubscriptionStatus, name="subscriptionstatus"), default=SubscriptionStatus.CREATED)
    subscription_plan = Column(SQLEnum(SubscriptionPlan, name="subscriptionplan"), nullable=True)
    florist_id = Column(UUID(as_uuid=True), ForeignKey("florists.id"), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    skip_next_delivery = Column(Boolean, nullable=False, default=False)
    email_notifications_enabled = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
```

### 2. Replace `db/users.py` with DB-backed functions

The existing function signatures stay the same so call sites don't need to change:

```python
# db/users.py — new implementation
async def get_user_by_email(email: str, db: Session) -> Optional[User]: ...
async def get_user_by_id(user_id: UUID, db: Session) -> Optional[User]: ...
async def create_user(user_data: dict, db: Session) -> User: ...
async def update_user(user_id: UUID, updates: dict, db: Session) -> Optional[User]: ...
async def get_all_users(db: Session, include_archived: bool = False) -> list[User]: ...
async def archive_user(user_id: UUID, db: Session) -> Optional[User]: ...
```

Note: The `db: Session` parameter is added. All call sites that use these functions will need to pass the DB session. This is the main mechanical change across routes.

### 3. Update routes to pass DB session

Routes that call user store functions need to add `db: Session = Depends(get_db)` and pass it through. Affected routes:
- `routes/auth.py` — register, login, me
- `routes/me.py` — property, subscription, plan, skip, notifications
- `routes/admin.py` — users CRUD
- `routes/florist.py` — florist me (looks up user)
- `routes/pm.py` — PM stats, residents (looks up users)
- `routes/payments.py` — all payment routes (need stripe IDs from user)

### 4. Update auth service

`auth/service.py` currently calls `get_user_by_email` without a DB session. It needs to accept a session parameter or use a dependency.

### 5. Update seed

`db/seed.py` currently writes users to `_users` dict. Change to use `db.add(user)` / `db.commit()` pattern, same as properties and florists already do.

---

## What Does NOT Change

- API contracts (request/response shapes stay identical)
- JWT token structure
- Route paths
- Business logic in services
- Frontend code
- Stripe integration logic (just reads/writes user fields differently)
- All other models (property, florist, delivery, payment, etc.)

---

## Migration Safety

Since users are currently in-memory, there is no data to migrate. Running migration 011 on a fresh database creates the table. Running it on the production database (which has no users table) also just creates the table. No data loss risk.

Migration 012 (FK constraints) requires that the users table exists first and that existing rows in deliveries/payments/etc. have valid user_id values. Since those tables are also empty in production (no real users yet), this is safe.

---

## Testing

Each route change should be verified with the existing test suite. The property-based tests in `tests/` cover the core business logic and should continue to pass. Key flows to manually verify after migration:

1. Register → login → select property → activate subscription → view deliveries
2. Admin creates user → assigns PM to property → PM views dashboard
3. Florist marks delivery delivered → admin generates payout
