# Customer Dashboard BRD

## Document Info

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Date | December 30, 2025 |
| Status | Draft |
| Owner | Product |

---

## Business Objective

Provide Bloom subscribers with a self-service dashboard to manage their subscription, view deliveries, and update account settings. Reduce support burden by enabling customers to pause, skip, and cancel without contacting support.

---

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| Subscription status display | Onboarding flow (separate feature) |
| Pause/resume subscription | Florist selection (Bloom-controlled) |
| Skip individual deliveries | Delivery schedule changes (property-level) |
| Cancel subscription | Payment processing integration |
| View delivery history | Upgrade/add-on purchases |
| Update profile info | Real-time delivery tracking |
| View billing history | |

---

## User Stories

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-1 | Subscriber | See my subscription status at a glance | I know if I'm active or paused |
| US-2 | Subscriber | See my next delivery date | I can plan accordingly |
| US-3 | Subscriber | Skip my next delivery | I don't receive flowers when away |
| US-4 | Subscriber | Pause my subscription | I can take a break without canceling |
| US-5 | Subscriber | Resume my subscription | I can restart after a pause |
| US-6 | Subscriber | Cancel my subscription | I can stop the service |
| US-7 | Subscriber | View my delivery history | I can see what I've received |
| US-8 | Subscriber | Update my profile | I can keep my info current |
| US-9 | Subscriber | View my billing history | I can see past charges |

---

## Functional Requirements

### FR-1: Home Page

| Requirement | Description |
|-------------|-------------|
| FR-1.1 | Display welcome message with customer name |
| FR-1.2 | Display property name |
| FR-1.3 | Display subscription status (ACTIVE, PAUSED) |
| FR-1.4 | Display next delivery date with countdown |
| FR-1.5 | Provide quick action to skip next delivery |
| FR-1.6 | Provide quick action to pause/resume subscription |
| FR-1.7 | Display last delivery summary |

### FR-2: Subscription Page

| Requirement | Description |
|-------------|-------------|
| FR-2.1 | Display subscription status with visual indicator |
| FR-2.2 | Display member since date |
| FR-2.3 | Display delivery schedule (read-only) |
| FR-2.4 | Provide pause subscription action |
| FR-2.5 | Provide resume subscription action |
| FR-2.6 | Provide cancel subscription action |
| FR-2.7 | Cancel flow must offer pause as alternative |

### FR-3: Deliveries Page

| Requirement | Description |
|-------------|-------------|
| FR-3.1 | Display table of upcoming deliveries |
| FR-3.2 | Allow skip action on upcoming deliveries |
| FR-3.3 | Allow unskip action on skipped deliveries |
| FR-3.4 | Disable skip within 48-hour cutoff |
| FR-3.5 | Display table of past deliveries |
| FR-3.6 | Show delivery status (Delivered, Skipped) |

### FR-4: Account Page

| Requirement | Description |
|-------------|-------------|
| FR-4.1 | Display profile information (name, email, unit) |
| FR-4.2 | Allow profile editing |
| FR-4.3 | Display payment method on file |
| FR-4.4 | Display billing history table |
| FR-4.5 | Allow viewing invoice details |
| FR-4.6 | Display notification preferences |

---

## Business Rules

| ID | Rule |
|----|------|
| BR-1 | Delivery schedule is set at property level; customers cannot change it |
| BR-2 | Skip cutoff is 48 hours before scheduled delivery |
| BR-3 | Paused subscriptions do not generate orders or charges |
| BR-4 | Cancel must be as easy as sign-up (California ARL compliance) |
| BR-5 | Cancel flow must offer pause as retention alternative |
| BR-6 | Onboarding is one-time only; dashboard handles all post-onboarding actions |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Self-service rate | >80% of subscription changes via dashboard |
| Support ticket reduction | 50% fewer subscription-related tickets |
| Pause-to-cancel ratio | >30% choose pause over cancel |
| Resume rate | >50% of paused subscriptions resume |

---

## Dependencies

| Dependency | Description |
|------------|-------------|
| Authentication | AWS Cognito for user sessions |
| API | `/me` endpoints for user data |
| Database | User, Subscription, Delivery tables |
| Onboarding | Must be complete before dashboard access |

---

## Constraints

| Constraint | Description |
|------------|-------------|
| Property-level scheduling | Customers cannot modify delivery day/cadence |
| Florist assignment | Bloom controls florist; not visible to customers |
| No real-time tracking | Polling-based updates acceptable for MLP |

---

## References

| Document | Location |
|----------|----------|
| Account Dashboard Research | `.kiro/research/account-dashboard-research.md` |
| Subscription Retention Research | `.kiro/research/subscription-retention-research.md` |
| Delivery Scheduling Research | `.kiro/research/delivery-scheduling-research.md` |
| Billing Compliance Research | `.kiro/research/billing-compliance-research.md` |
