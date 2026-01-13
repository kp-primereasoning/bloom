# Subscription Retention & Churn Reduction Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on subscription retention strategies and churn reduction for the Bloom platform.

---

## Key Statistics

- **51.7%** of consumers likely to cancel would use pause features if available (Chargebee)
- **10-20%** of active cancellations can be deflected with pause offerings (ProfitWell)
- Pause features show **compelling save rates** for subscription businesses

---

## The Power of Pause

### Why Pause Works
1. **Reduces friction**: Easier than canceling and re-subscribing
2. **Maintains relationship**: Customer stays in your system
3. **Addresses temporary issues**: Travel, budget, product overload
4. **Higher return rate**: Paused customers more likely to resume than churned

### Pause vs Cancel
| Aspect | Pause | Cancel |
|--------|-------|--------|
| Customer intent | Temporary break | Permanent exit |
| Re-activation | Automatic resume | Requires re-signup |
| Data retention | Full history kept | May lose preferences |
| Win-back effort | Minimal | Significant |

---

## Common Churn Reasons & Solutions

### 1. Product Overload
> "I have too many flowers building up"

**Solutions:**
- Skip next delivery option
- Reduce delivery frequency
- Pause for 1-3 months

### 2. Budget Constraints
> "I can't afford it right now"

**Solutions:**
- Pause subscription
- Downgrade to less frequent plan
- Offer promotional discount (carefully)

### 3. Not Using Service
> "I'm not home enough to enjoy them"

**Solutions:**
- Pause during travel
- Skip specific deliveries
- Delivery to alternate address (future)

### 4. Dissatisfaction
> "The quality isn't what I expected"

**Solutions:**
- Feedback collection
- Quality improvement
- Florist change (admin action)

---

## Retention Strategies for Bloom

### 1. Flexible Subscription Management
```
┌─────────────────────────────────────────┐
│  Manage Your Subscription               │
│  ─────────────────────────────────────  │
│  [Skip Next Delivery]                   │
│  [Pause Subscription]                   │
│  [Change Delivery Frequency]            │
│  [Cancel Subscription]                  │
└─────────────────────────────────────────┘
```

### 2. Cancellation Flow with Save Offers
```
User clicks "Cancel"
    ↓
"We're sorry to see you go. Can you tell us why?"
    ↓
[Too expensive] → Offer pause or frequency change
[Too many flowers] → Offer skip or pause
[Moving] → Offer pause
[Other] → Collect feedback
    ↓
"Are you sure? You can pause instead."
    ↓
[Pause Instead] or [Continue Cancellation]
```

### 3. Proactive Engagement
- Monitor skip patterns (3+ consecutive skips = at-risk)
- Send re-engagement emails
- Offer incentives to resume

---

## Pause Implementation

### Pause Options
| Duration | Use Case |
|----------|----------|
| 1 month | Short break |
| 2 months | Extended travel |
| 3 months | Seasonal pause |
| Indefinite | Until customer resumes |

### Pause Rules
- No billing during pause
- Automatic resume after duration (if set)
- Customer can resume early anytime
- Pause doesn't affect subscription history

### Data Model
```
User
├── subscription_status: ACTIVE | PAUSED | CANCELLED
├── pause_started_at: datetime?
├── pause_ends_at: datetime?
└── pause_reason: string?
```

---

## Skip vs Pause

### Skip
- Single delivery
- Subscription remains active
- No billing for skipped delivery
- Good for: Vacation, one-time conflict

### Pause
- Multiple deliveries
- Subscription status changes
- No billing during pause
- Good for: Extended break, budget issues

### UI Guidance
```
"Going on vacation?"
→ Skip 1-2 deliveries

"Need a longer break?"
→ Pause your subscription
```

---

## Win-Back Strategies

### For Paused Customers
1. **Reminder email** at pause end date
2. **Easy resume** button in email
3. **"We miss you"** messaging

### For Cancelled Customers
1. **Exit survey** to understand reasons
2. **Win-back email** after 30 days
3. **Special offer** to return (use sparingly)

---

## Metrics to Track

### Churn Metrics
| Metric | Formula | Target |
|--------|---------|--------|
| Monthly Churn Rate | Cancelled / Total | < 5% |
| Pause Rate | Paused / Total | Monitor |
| Skip Rate | Skips / Deliveries | Monitor |
| Resume Rate | Resumed / Paused | > 50% |

### Retention Metrics
| Metric | Formula | Target |
|--------|---------|--------|
| Customer Lifetime | Avg months subscribed | > 12 |
| Save Rate | Saved / Attempted Cancel | > 20% |
| Net Revenue Retention | (MRR + Expansion - Churn) / MRR | > 100% |

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Basic pause functionality (indefinite)
2. Skip next delivery
3. Simple cancellation flow
4. Pause/resume emails

### Phase 2: Enhanced
1. Timed pause options (1-3 months)
2. Cancellation save flow with alternatives
3. Skip multiple future deliveries
4. At-risk customer identification

### Phase 3: Advanced
1. Predictive churn modeling
2. Automated win-back campaigns
3. Loyalty/rewards program
4. Personalized retention offers

---

## Cancellation Flow Design

### Best Practices
1. **Don't hide cancel**: Builds trust, required by law
2. **Understand why**: Collect feedback
3. **Offer alternatives**: Pause, skip, downgrade
4. **Make it easy**: If they want to cancel, let them
5. **Confirm clearly**: No dark patterns

### Flow Steps
```
1. "Why are you canceling?" (required)
   - Too expensive
   - Not using enough
   - Moving/traveling
   - Quality issues
   - Other

2. "Would any of these help?"
   - [Pause for a month]
   - [Skip next 2 deliveries]
   - [Talk to support]

3. "Are you sure?"
   - [Keep my subscription]
   - [Cancel subscription]

4. Confirmation
   - "Your subscription has been cancelled"
   - "You can resubscribe anytime"
```

---

## Sources

- [Chargebee - The Power of Pause](https://www.chargebee.com/blog/power-of-pause-subscription-retention-strategy/)
- [Recurly - Reduce Churn Strategies](https://recurly.com/blog/reduce-churn/)
- [Recurly - Pause as Retention Tactic](https://recurly.com/blog/why-pausing-a-subscription-can-be-a-powerful-retention-tactic/)
- [Recurly - Cancellation Flow Examples](https://recurly.com/blog/cancellation-flow-examples-to-improve-subscriber-retention/)
- [Recharge - Customer Retention Strategies](https://support.getrecharge.com/hc/en-us/articles/360008830333-Customer-cancellation-and-retention-strategies)
- [EasySubscription - Retention Strategies](https://easysubscription.io/6-retention-first-strategies-to-reduce-churn-grow-subscription-revenue/)

*Content was rephrased for compliance with licensing restrictions*
