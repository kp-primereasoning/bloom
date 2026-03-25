# Bloom MLP Task List

**Goal:** Property goes live with real subscriptions and fulfilled deliveries.
**Guiding principle:** Activation over automation. Ship what matters, skip what doesn't.

---

## Phase 0: Unblock Deployment (Day 1)

Everything else is blocked until the Amplify build passes again.

- [x] **0.1** Fix TypeScript compilation errors in frontend test files
  - Add missing `subscription_plan` field to mock `MeResponse` objects
  - Fix `archived_at` property references on Delivery type (doesn't exist in TS type)
  - Fix React Portal type issues in test setup
  - Verify: `pnpm --filter web build` passes locally
- [ ] **0.2** Push fix and confirm Amplify deployment succeeds
- [ ] **0.3** Smoke test deployed frontend — login, navigate all 4 dashboards, verify API connectivity

---

## Phase 1: Stripe Payment Integration (Weeks 1–2)

No revenue without payments. This is the single biggest gap.

### Backend

- [x] **1.1** Add `stripe` Python package to requirements.txt
- [x] **1.2** Create `services/payments.py` — Stripe client initialization using Secrets Manager (`bloom/dev/stripe-api-key`)
- [x] **1.3** Create Alembic migration (008) for payment tables:
  - `payments` table: id, user_id, property_id, stripe_payment_intent_id, amount_cents, currency, status (PENDING/SUCCEEDED/FAILED/REFUNDED), subscription_plan, created_at
  - `invoices` table: id, user_id, stripe_invoice_id, amount_cents, status, period_start, period_end, pdf_url, created_at
  - `florist_payouts` table: id, florist_id, stripe_transfer_id, amount_cents, status, period_start, period_end, created_at
- [x] **1.4** Create Stripe Customer on user registration (store `stripe_customer_id` on User model, add column via migration)
- [x] **1.5** Implement subscription billing endpoints in `routes/payments.py`:
  - `POST /payments/setup-intent` — create Stripe SetupIntent for card collection
  - `POST /payments/subscribe` — create Stripe Subscription tied to plan (ESSENTIAL/SIGNATURE/STATEMENT)
  - `POST /payments/cancel` — cancel Stripe Subscription
  - `GET /payments/invoices` — list user's invoices from Stripe
  - `GET /payments/payment-method` — get current payment method on file
  - `PATCH /payments/payment-method` — update payment method
- [x] **1.6** Implement Stripe webhook handler at `POST /webhooks/stripe`:
  - `invoice.payment_succeeded` — record payment, confirm delivery generation
  - `invoice.payment_failed` — mark payment failed, pause subscription
  - `customer.subscription.deleted` — update user subscription_status to PAUSED
  - Verify webhook signature using `bloom/dev/stripe-webhook-secret`
- [x] **1.7** Wire subscription activation to Stripe — when user calls `PATCH /me/subscription` with status=ACTIVE, create Stripe Subscription
- [x] **1.8** Implement admin florist payout endpoint:
  - `POST /admin/payouts/generate` — calculate amounts per florist for a date range based on delivered orders
  - `GET /admin/payouts` — list payout history
- [x] **1.9** Add Stripe price IDs to config (map ESSENTIAL/SIGNATURE/STATEMENT to Stripe Price objects)
- [x] **1.10** Property-based tests: payment creation, webhook idempotency, payout calculation

### Frontend

- [x] **1.11** Create `PaymentMethodPage` in customer dashboard — Stripe Elements card form using `@stripe/react-stripe-js`
- [x] **1.12** Update `SubscriptionPage` — activate button triggers payment setup flow if no payment method on file
- [x] **1.13** Create `BillingPage` in customer dashboard — invoice history, current plan cost, next billing date
- [x] **1.14** Update customer `AccountPage` billing card — link to real billing page instead of placeholder
- [x] **1.15** Add payout view to admin dashboard — table of florist payouts with generate button

### Infrastructure

- [ ] **1.16** Replace Stripe secret placeholders in Secrets Manager with real test keys (`sk_test_...`, `whsec_...`)
- [ ] **1.17** Add `STRIPE_PUBLISHABLE_KEY` env var to Amplify for frontend
- [ ] **1.18** Register Stripe webhook endpoint URL pointing to App Runner

---

## Phase 2: Email Notifications (Week 2–3)

Residents and florists need to know what's happening without logging in.

### Backend

- [x] **2.1** Create `services/email.py` — SES client with send_email helper, HTML template rendering
- [x] **2.2** Create email templates (HTML + plain text) in `templates/email/`:
  - `welcome.html` — sent on registration
  - `subscription_confirmed.html` — sent when subscription activates
  - `delivery_scheduled.html` — sent when delivery is generated (X days before)
  - `delivery_completed.html` — sent when florist marks delivered
  - `delivery_missed.html` — sent when delivery marked missed
  - `payment_receipt.html` — sent on successful payment
  - `payment_failed.html` — sent on failed payment
- [x] **2.3** Add email triggers to existing flows:
  - `POST /auth/register` → send welcome email
  - `PATCH /me/subscription` (activate) → send subscription_confirmed
  - Delivery generation service → send delivery_scheduled
  - `PATCH /florist/deliveries/{id}` (DELIVERED) → send delivery_completed
  - `PATCH /florist/deliveries/{id}` (MISSED) → send delivery_missed
  - Stripe webhook `invoice.payment_succeeded` → send payment_receipt
  - Stripe webhook `invoice.payment_failed` → send payment_failed
- [x] **2.4** Add `email_notifications_enabled` boolean to User model (default true), migration (009)
- [x] **2.5** Respect PM notification preferences from `pm_preferences` table when sending PM-related emails
- [x] **2.6** Add `GET /me/notification-preferences` and `PATCH /me/notification-preferences` endpoints
- [ ] **2.7** Test: verify emails send in dev (SES sandbox — add test addresses to verified identities)

### Frontend

- [x] **2.8** Add notification preferences toggle to customer `AccountPage`
- [x] **2.9** Add notification preferences to florist `SettingsPage`

### Infrastructure

- [ ] **2.10** Verify SES sender identity (`noreply@bloom.com` or verified domain)
- [ ] **2.11** When ready for real users: request SES production access (exit sandbox)

---

## Phase 3: Florist Capacity & Availability (Week 3)

Prevent over-assignment. Florists need to set when and how much they can deliver.

### Backend

- [x] **3.1** Create Alembic migration (010) for `florist_availability` table:
  - id, florist_id, day_of_week (0-6), max_deliveries_per_day, is_available, created_at, updated_at
- [x] **3.2** Implement endpoints in `routes/florist.py`:
  - `GET /florist/availability` — return current availability windows
  - `PUT /florist/availability` — bulk upsert availability for all days
- [x] **3.3** Update delivery generation service (`services/delivery_generation.py`):
  - Check florist availability for the scheduled delivery day
  - Respect `max_deliveries_per_day` cap
  - Skip generation if florist is unavailable that day
- [x] **3.4** Property-based tests: capacity limits respected, unavailable days skipped

### Frontend

- [x] **3.5** Replace localStorage-based AvailabilityPage with real API calls
- [x] **3.6** Day-of-week grid with toggle (available/unavailable) and max deliveries input per day

---

## Phase 4: API Documentation (Week 3, easy win)

FastAPI generates this almost for free.

- [x] **4.1** Enable OpenAPI docs in `main.py` (FastAPI auto-generates at `/docs` and `/redoc`)
- [x] **4.2** Add response models (`response_model=`) to all route handlers that are missing them
- [x] **4.3** Add docstrings/descriptions to all endpoints for Swagger display
- [x] **4.4** Add API tags to group endpoints by domain (auth, admin, customer, florist, pm, payments, public)
- [ ] **4.5** Verify `/docs` is accessible on deployed App Runner (may need to restrict to dev/admin only in prod)

---

## Phase 5: Polish & Hardening (Week 4)

### Soft Delete Consistency

- [x] **5.1** Audit all SQLAlchemy queries — add `.filter(status != 'ARCHIVED')` where missing
- [x] **5.2** Ensure admin endpoints can still list archived records with `?include_archived=true` param
- [x] **5.3** Add cascade behavior: archiving a property should archive its deliveries

### Webhook Hardening

- [x] **5.4** Add Shopify webhook HMAC signature validation in the Shopify app
- [x] **5.5** Add webhook event logging table (webhook_events: id, source, event_type, payload_hash, status, created_at)
- [x] **5.6** Log all incoming webhooks (Shopify + Stripe) for audit trail

### Error Handling Edge Cases

- [x] **5.7** Add DB-level constraint: prevent deleting a property with active subscriptions (or force-pause first)
- [x] **5.8** Handle florist disconnection: if florist disconnects Shopify mid-cycle, flag affected deliveries
- [x] **5.9** Add idempotency key support to payment endpoints (prevent double-charge on retry)

### Monitoring

- [x] **5.10** Add CloudWatch custom metrics via `services/metrics.py`:
  - `bloom.deliveries.generated` (count per run)
  - `bloom.deliveries.success_rate` (delivered / total)
  - `bloom.payments.failed` (count)
  - `bloom.subscriptions.active` (gauge)
- [ ] **5.11** Create CloudWatch alarms:
  - Payment failure rate > 10% in 1 hour
  - Zero deliveries generated on a scheduled day
  - API error rate > 5% sustained 5 minutes
- [ ] **5.12** Add SNS topic for alarm notifications → email to ops team

---

## Phase 6: Pre-Launch Checklist (Week 4–5)

### Security

- [ ] **6.1** Rotate all dev secrets in Secrets Manager before going live
- [ ] **6.2** Restrict RDS security group — remove `0.0.0.0/0`, allow only App Runner + VPN
- [ ] **6.3** Enable RDS deletion protection for production
- [ ] **6.4** Verify all API endpoints validate input (no raw SQL, no injection vectors)
- [ ] **6.5** Confirm rate limiting is active on production App Runner
- [ ] **6.6** Review CORS origins — remove localhost, keep only production domains

### Data

- [ ] **6.7** Create production seed script — real properties, real florist accounts (no test data)
- [ ] **6.8** Verify Alembic migrations run cleanly on a fresh database
- [ ] **6.9** Test backup/restore: trigger RDS snapshot, restore to new instance, verify data

### Deployment

- [ ] **6.10** Set up production environment variables in Amplify (VITE_API_BASE_URL, STRIPE_PUBLISHABLE_KEY)
- [ ] **6.11** Set up production App Runner environment variables
- [ ] **6.12** Verify GitHub Actions CI runs tests before deploy
- [ ] **6.13** Do a full deploy to production: API → run migrations → frontend
- [ ] **6.14** Smoke test production: register → subscribe → payment → delivery generated → florist marks delivered

### Go-Live Validation

- [ ] **6.15** Activate one real property with delivery cadence configured
- [ ] **6.16** Assign one real florist (Shopify connected, products synced, tiers mapped)
- [ ] **6.17** Assign one real PM to the property
- [ ] **6.18** Register 2-3 test residents, subscribe them, verify delivery generation
- [ ] **6.19** Florist marks deliveries as delivered, verify status updates propagate
- [ ] **6.20** Verify payment charges appear in Stripe dashboard
- [ ] **6.21** Verify all email notifications fire correctly

---

## Explicitly Deferred (Not MLP)

These are real features but not needed for first property go-live:

| Feature | Why Deferred |
|---------|-------------|
| Cognito migration | Current JWT auth works. Migrate after launch when user volume justifies it |
| Neo4j graph DB | PostgreSQL handles all current queries fine |
| Resident order upgrades/add-ons | Can be added after core subscription flow is proven |
| PM reward redemption | Tier display is enough for launch; redemption is a retention feature |
| E2E tests (Playwright/Cypress) | Property-based + unit tests are sufficient; manual QA for launch |
| Per-endpoint rate limiting | Global 60 req/min is fine at launch scale |
| Florist vetting/approval workflow | Admin manually creates florist accounts — vetting is a human process |
| Daily Shopify product sync Lambda | Manual sync via Shopify app is sufficient |
| Advanced analytics dashboard | CloudWatch metrics + admin dashboard cover launch needs |

---

## Timeline Summary

| Phase | What | Duration | Effort |
|-------|------|----------|--------|
| 0 | Fix deployment | 1 day | ~2 hours |
| 1 | Stripe payments | 2 weeks | ~50 hours |
| 2 | Email notifications | 1 week | ~25 hours |
| 3 | Florist capacity | 3-4 days | ~15 hours |
| 4 | API docs | 1 day | ~4 hours |
| 5 | Polish & hardening | 1 week | ~20 hours |
| 6 | Pre-launch checklist | 1 week | ~15 hours |
| **Total** | | **~5 weeks** | **~130 hours** |
