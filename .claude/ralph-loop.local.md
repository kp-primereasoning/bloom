---
active: true
iteration: 1
max_iterations: 20
completion_promise: "All tests pass"
started_at: "2026-01-08T04:15:56Z"
---

Add subscription_plan field (ESSENTIAL/SIGNATURE/STATEMENT enum) to User model in apps/api/models/user.py, create Alembic migration, add PATCH /me/plan endpoint in routes/me.py to persist plan selection, and update apps/web/src/pages/customer/SubscriptionPage.tsx to call the API instead of only using localStorage. Run both backend (pytest) and frontend (pnpm test) tests.
