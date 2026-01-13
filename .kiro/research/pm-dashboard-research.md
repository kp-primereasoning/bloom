# Property Manager Dashboard Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on dashboard patterns for property managers in multifamily/residential property management software.

---

## Industry Leaders Reviewed

- **Aptexx** - Property management dashboard
- **Buildium** - Residential property management
- **Entrata** - Multifamily housing SaaS
- **RealPage** - Property management software
- **Livly** - Rental property management
- **BuildingLink** - Residential management

---

## Key Metrics Property Managers Need

### Engagement Metrics
| Metric | Description | Bloom Relevance |
|--------|-------------|-----------------|
| Participation Rate | % of residents subscribed | ✅ Primary KPI |
| Active Subscribers | Count of active subscriptions | ✅ Essential |
| Churn Rate | Cancellations over time | ✅ Important |
| Skip Rate | % of deliveries skipped | ✅ Engagement signal |

### Financial Metrics (if applicable)
| Metric | Description | Bloom Relevance |
|--------|-------------|-----------------|
| Revenue Generated | Total subscription revenue | ⚠️ Future phase |
| Rewards Earned | Property-level incentives | ✅ Per background |

### Operational Metrics
| Metric | Description | Bloom Relevance |
|--------|-------------|-----------------|
| Upcoming Deliveries | Next delivery count | ✅ Visibility |
| Delivery Success Rate | Completed vs scheduled | ⚠️ Future phase |

---

## Common Dashboard Patterns

### 1. Overview/Summary Cards
- Key metrics at a glance
- Visual indicators (up/down arrows, colors)
- Quick comparison to previous period

### 2. Resident List/Table
- Searchable, sortable list
- Status indicators (active, paused, cancelled)
- Quick actions (view details)

### 3. Trend Charts
- Participation over time
- Subscription growth
- Engagement trends

### 4. Activity Feed
- Recent sign-ups
- Recent cancellations
- Delivery completions

---

## Recommended PM Dashboard for Bloom

### Page Structure: `/pm` (Property Manager Portal)

#### Section 1: Property Overview Card
```
┌─────────────────────────────────────────┐
│  [Property Name]                        │
│  ─────────────────────────────────────  │
│  Active Subscribers: 45 / 120 units     │
│  Participation Rate: 37.5%  ↑ 5%        │
│  Next Delivery: Jan 3, 2026             │
│  Delivery Cadence: Bi-weekly            │
└─────────────────────────────────────────┘
```

#### Section 2: Quick Stats Row
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Active   │ │ Paused   │ │ New This │ │ Cancelled│
│   45     │ │    8     │ │  Month   │ │ This Mo  │
│          │ │          │ │    12    │ │    2     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### Section 3: Resident Subscription List
```
┌─────────────────────────────────────────────────────┐
│ Search: [____________]  Filter: [All Statuses ▼]    │
├─────────────────────────────────────────────────────┤
│ Unit  │ Resident      │ Status  │ Since     │ Skip │
│ 101   │ Jane Smith    │ Active  │ Nov 2025  │  0   │
│ 205   │ John Doe      │ Paused  │ Oct 2025  │  2   │
│ 312   │ Mary Johnson  │ Active  │ Dec 2025  │  0   │
└─────────────────────────────────────────────────────┘
```

#### Section 4: Participation Trend (Optional for MLP)
- Simple line chart showing participation % over last 6 months
- Goal line if property has target

---

## What PMs Should NOT See

Based on Bloom's model:
- ❌ Individual resident payment details
- ❌ Florist assignment controls
- ❌ Delivery schedule modification
- ❌ Pricing configuration
- ❌ Subscription plan changes

PMs have read-only visibility into their property's program.

---

## Rewards/Incentives Display

Per Bloom background: "Redeem property-level rewards and incentives"

### Rewards Section
```
┌─────────────────────────────────────────┐
│  Property Rewards                       │
│  ─────────────────────────────────────  │
│  Current Balance: $150                  │
│  Earned This Month: $50                 │
│  [Redeem Rewards] button                │
│                                         │
│  How rewards work:                      │
│  • $5 per new subscriber                │
│  • $2 per month per active subscriber   │
└─────────────────────────────────────────┘
```

---

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/pm/property` | GET | Get PM's assigned property details |
| `/pm/subscribers` | GET | List residents with subscription status |
| `/pm/stats` | GET | Aggregated metrics for dashboard |
| `/pm/rewards` | GET | Current reward balance and history |
| `/pm/rewards/redeem` | POST | Redeem rewards (future) |

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Property overview with basic stats
2. Resident list with subscription status
3. Read-only view (no actions)

### Phase 2: Enhanced
1. Participation trend chart
2. Rewards display and redemption
3. Export resident list (CSV)

### Phase 3: Advanced
1. Multi-property support (for PM companies)
2. Comparative analytics
3. Goal setting and tracking

---

## UX Considerations

### From Industry Research
- "Aggregates property and portfolio data in one place" (Aptexx)
- "Real-time metrics with customizable dashboards" (Revela)
- "Resident engagement tools enable digital payments, service requests" (Revela)

### For Bloom
- Keep it simple - PMs want quick visibility, not complex analytics
- Mobile-friendly - PMs often check on the go
- Clear status indicators - Visual cues for subscription health
- No action overload - Read-only is fine for MLP

---

## Sources

- [Aptexx Property Management Dashboard](https://aptexx.com/solutions/dashboard/)
- [Second Nature - Property Management Dashboards](https://www.secondnature.com/blog/property-management-dashboard)
- [Buildium Property Management Software](https://www.buildium.com/)
- [Livly Rental Property Management](https://www.livly.io/)
- [Revela - Multifamily Property Management](https://www.revela.co/resources/best-multifamily-property-management-software)

*Content was rephrased for compliance with licensing restrictions*
