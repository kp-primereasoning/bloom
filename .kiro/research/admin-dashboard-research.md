# Admin Operations Dashboard Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on internal operations dashboards for SaaS platforms, informing the design of Bloom's admin portal.

---

## SaaS Dashboard Patterns

### Key Characteristics
- Consolidates metrics in single interface
- Real-time visibility into platform health
- Actionable insights for operations
- Drill-down capabilities

### Common Dashboard Types
1. **Executive Dashboard**: High-level KPIs
2. **Operations Dashboard**: Day-to-day management
3. **Financial Dashboard**: Revenue and billing
4. **Customer Health Dashboard**: Engagement metrics

---

## Key Metrics for Bloom Admin

### Platform Health
| Metric | Description | Priority |
|--------|-------------|----------|
| Total Active Subscriptions | Platform-wide count | ✅ Essential |
| Total Properties | Active properties | ✅ Essential |
| Total Florists | Connected florists | ✅ Essential |
| MRR (Monthly Recurring Revenue) | Revenue metric | ✅ Essential |

### Growth Metrics
| Metric | Description | Priority |
|--------|-------------|----------|
| New Subscriptions (MTD) | Month-to-date signups | ✅ Essential |
| Churn Rate | Cancellations / Total | ✅ Essential |
| Net Growth | New - Churned | ✅ Essential |
| Property Activation Rate | New properties/month | ⚠️ Phase 2 |

### Operational Metrics
| Metric | Description | Priority |
|--------|-------------|----------|
| Upcoming Deliveries | Next 7 days | ✅ Essential |
| Pending Orders | Awaiting fulfillment | ✅ Essential |
| Florist Capacity | Orders vs capacity | ⚠️ Phase 2 |
| Failed Payments | Dunning queue | ✅ Essential |

---

## Recommended Admin Dashboard for Bloom

### Page Structure: `/admin` (Admin Portal)

#### Section 1: Platform Overview
```
┌─────────────────────────────────────────────────────────┐
│  Bloom Platform Overview                                │
│  ─────────────────────────────────────────────────────  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Active   │ │ Active   │ │ Active   │ │   MRR    │   │
│  │ Subs     │ │ Props    │ │ Florists │ │          │   │
│  │   450    │ │    12    │ │     8    │ │  $13.5K  │   │
│  │  ↑ 12%   │ │  ↑ 2     │ │  ↑ 1     │ │  ↑ 8%   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Section 2: Quick Actions
```
┌─────────────────────────────────────────┐
│  Quick Actions                          │
│  ─────────────────────────────────────  │
│  [+ Add Property]  [+ Add Florist]      │
│  [Assign Florist]  [View Orders]        │
└─────────────────────────────────────────┘
```

#### Section 3: Upcoming Deliveries
```
┌─────────────────────────────────────────────────────────┐
│  Upcoming Deliveries (Next 7 Days)                      │
├─────────────────────────────────────────────────────────┤
│ Date       │ Property        │ Orders │ Florist    │ St │
│ Jan 3      │ Sunset Towers   │   25   │ Rose & Co  │ ✓  │
│ Jan 3      │ Harbor View     │   15   │ Rose & Co  │ ✓  │
│ Jan 5      │ Park Place      │   18   │ Lily's     │ ⚠  │
│ Jan 7      │ Ocean Heights   │   22   │ Unassigned │ ❌ │
└─────────────────────────────────────────────────────────┘
```

#### Section 4: Alerts & Issues
```
┌─────────────────────────────────────────┐
│  ⚠️ Attention Required                  │
│  ─────────────────────────────────────  │
│  • 3 properties without florist         │
│  • 5 failed payments pending            │
│  • 1 florist at capacity                │
└─────────────────────────────────────────┘
```

#### Section 5: Recent Activity
```
┌─────────────────────────────────────────┐
│  Recent Activity                        │
│  ─────────────────────────────────────  │
│  • New subscription: Jane S. (Sunset)   │
│  • Cancellation: John D. (Harbor)       │
│  • Property activated: Park Place       │
│  • Florist connected: Lily's Flowers    │
└─────────────────────────────────────────┘
```

---

## Admin Management Pages

### Properties Management (`/admin/properties`)
- List all properties
- Status: Active, Pending, Inactive
- Assigned florist
- Subscriber count
- Actions: Edit, Assign Florist, View Details

### Florists Management (`/admin/florists`)
- List all florists
- Shopify connection status
- Assigned properties
- Capacity utilization
- Actions: Edit, View Orders, Disconnect

### Users Management (`/admin/users`)
- List all users (customers, PMs)
- Role, property, subscription status
- Actions: Edit, Impersonate (careful!)

### Orders Management (`/admin/orders`)
- List orders by date/property/florist
- Status: Pending, Fulfilled, Delivered
- Actions: View Details, Mark Fulfilled

---

## Florist Assignment Workflow

### Assignment Interface
```
┌─────────────────────────────────────────────────────────┐
│  Assign Florist to Property                             │
│  ─────────────────────────────────────────────────────  │
│  Property: [Sunset Towers ▼]                            │
│                                                         │
│  Available Florists:                                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ Rose & Co        │ 3 properties │ 75% capacity│   │
│  │ ○ Lily's Flowers   │ 2 properties │ 50% capacity│   │
│  │ ○ Bloom Studio     │ 1 property   │ 25% capacity│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [Cancel]  [Assign Selected]                            │
└─────────────────────────────────────────────────────────┘
```

### Assignment Considerations
- Geographic proximity (future)
- Current capacity
- Quality ratings (future)
- Existing relationships

---

## Supply-Demand Balancing

### Capacity Monitoring
```
Florist Capacity Dashboard
┌─────────────────────────────────────────────────────────┐
│ Florist         │ Max/Day │ Assigned │ Utilization     │
│ Rose & Co       │   100   │    75    │ ████████░░ 75%  │
│ Lily's Flowers  │    80   │    40    │ █████░░░░░ 50%  │
│ Bloom Studio    │    50   │    12    │ ██░░░░░░░░ 24%  │
└─────────────────────────────────────────────────────────┘
```

### Alerts
- Florist approaching capacity (>80%)
- Florist over capacity
- Property without florist
- Unbalanced distribution

---

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/dashboard` | GET | Overview metrics |
| `/admin/properties` | GET/POST | List/create properties |
| `/admin/properties/:id` | GET/PUT | Property details |
| `/admin/properties/:id/assign` | POST | Assign florist |
| `/admin/florists` | GET/POST | List/create florists |
| `/admin/florists/:id` | GET/PUT | Florist details |
| `/admin/users` | GET | List users |
| `/admin/orders` | GET | List orders |
| `/admin/alerts` | GET | Active alerts |

---

## Implementation Recommendations for Bloom

### Phase 1: MLP (Current)
- Basic CRUD for properties, florists, users
- Simple list views with status
- Manual florist assignment
- Basic metrics (counts)

### Phase 2: Enhanced
- Dashboard with KPIs
- Upcoming deliveries view
- Alerts and issues panel
- Activity feed

### Phase 3: Advanced
- Capacity management
- Geographic assignment
- Revenue analytics
- Automated alerts

---

## Sources

- [UI Bakery - SaaS Dashboard](https://uibakery.io/templates/saas-dashboard)
- [SaaSGrid - SaaS Metrics & Reporting](https://www.saasgrid.com/)
- [Klipfolio - SaaS Dashboard Examples](https://www.klipfolio.com/resources/dashboard-examples/saas)
- [NetSuite - SaaS Dashboards](https://www.netsuite.com/portal/resource/articles/erp/saas-dashboards.shtml)
- [Databox - SaaS Dashboard Examples](https://databox.com/top-recommended-saas-dashboards)
- [Userpilot - SaaS Dashboard Examples](https://userpilot.com/blog/saas-dashboard-examples/)

*Content was rephrased for compliance with licensing restrictions*
