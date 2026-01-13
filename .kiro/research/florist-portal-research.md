# Florist Portal/Dashboard Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on order management and fulfillment dashboards for florists, informing the design of Bloom's florist portal.

---

## Industry Solutions Reviewed

- **Hana Florist POS** - Complete florist POS system
- **FloristWare** - Shop management for retail florists
- **Floranext** - Florist websites and POS
- **QuickFlora** - Florist software
- **Orderry** - Floral business software
- **JungleWorks** - Flower delivery management

---

## Key Features in Florist Software

### Order Management
| Feature | Description | Bloom Relevance |
|---------|-------------|-----------------|
| Order Queue | List of pending orders | ✅ Essential |
| Order Details | Customer, items, delivery info | ✅ Essential |
| Order Status | Track fulfillment progress | ✅ Essential |
| Delivery Routing | Optimize delivery routes | ⚠️ Future phase |

### Inventory Management
| Feature | Description | Bloom Relevance |
|---------|-------------|-----------------|
| Stock Levels | Current inventory | ❌ Shopify handles |
| Low Stock Alerts | Reorder notifications | ❌ Shopify handles |
| Product Catalog | Available arrangements | ✅ Sync from Shopify |

### Delivery Management
| Feature | Description | Bloom Relevance |
|---------|-------------|-----------------|
| Delivery Schedule | Daily/weekly view | ✅ Essential |
| Delivery Windows | Time slot management | ⚠️ Property-level |
| Driver Assignment | Route optimization | ❌ Out of scope |

---

## Bloom's Unique Model

Unlike traditional florist software, Bloom:
- Generates orders from subscriptions (not customer-initiated)
- Groups deliveries by property (batch fulfillment)
- Controls delivery cadence (florist doesn't set schedule)
- Syncs catalog from Shopify (florist manages in Shopify)

### What Florists Need from Bloom
1. See upcoming orders for their assigned properties
2. Confirm order fulfillment
3. View delivery schedule
4. Manage capacity/availability

---

## Recommended Florist Portal for Bloom

### Page Structure: `/florist` (Florist Portal)

#### Section 1: Dashboard Overview
```
┌─────────────────────────────────────────┐
│  Welcome, [Florist Name]                │
│  ─────────────────────────────────────  │
│  Upcoming Deliveries: 45                │
│  Next Delivery Date: Jan 3, 2026        │
│  Properties Assigned: 3                 │
└─────────────────────────────────────────┘
```

#### Section 2: Upcoming Orders
```
┌─────────────────────────────────────────────────────────┐
│ Delivery Date: Jan 3, 2026                              │
│ Filter: [All Properties ▼]                              │
├─────────────────────────────────────────────────────────┤
│ Property        │ Orders │ Status      │ Actions        │
│ Sunset Towers   │   25   │ Pending     │ [View Orders]  │
│ Harbor View     │   15   │ Pending     │ [View Orders]  │
│ Park Place      │    5   │ Confirmed   │ [View Orders]  │
└─────────────────────────────────────────────────────────┘
```

#### Section 3: Order Details (Expanded View)
```
┌─────────────────────────────────────────────────────────┐
│ Sunset Towers - Jan 3, 2026                             │
│ Delivery Address: 123 Sunset Blvd, Apt Lobby            │
├─────────────────────────────────────────────────────────┤
│ Unit  │ Arrangement      │ Upgrades    │ Notes          │
│ 101   │ Weekly Bouquet   │ None        │                │
│ 205   │ Weekly Bouquet   │ +Vase       │ Leave at door  │
│ 312   │ Weekly Bouquet   │ None        │                │
├─────────────────────────────────────────────────────────┤
│ Total Orders: 25                                        │
│ [Mark All Fulfilled] [Download Order List]              │
└─────────────────────────────────────────────────────────┘
```

#### Section 4: Delivery Calendar
```
┌─────────────────────────────────────────┐
│  January 2026                           │
│  ─────────────────────────────────────  │
│  Su Mo Tu We Th Fr Sa                   │
│           1  2 [3] 4                    │
│   5  6  7  8  9 10 11                   │
│  12 13 14 15 16[17]18                   │
│  19 20 21 22 23 24 25                   │
│  26 27 28 29 30[31]                     │
│                                         │
│  [3] = 45 orders  [17] = 42 orders      │
└─────────────────────────────────────────┘
```

---

## Order Fulfillment Workflow

### Bloom-Generated Orders
1. Bloom generates orders from active subscriptions
2. Orders grouped by property and delivery date
3. Florist receives notification of upcoming orders
4. Florist prepares arrangements
5. Florist marks orders as fulfilled
6. Bloom updates delivery status

### Order States
```
PENDING     → Order generated, awaiting fulfillment
CONFIRMED   → Florist acknowledged order
FULFILLED   → Florist completed preparation
DELIVERED   → Delivery confirmed (future)
```

---

## Capacity Management

### Florist Availability
Florists may need to indicate:
- Maximum orders per delivery date
- Blackout dates (holidays, vacations)
- Temporary capacity changes

### Capacity UI
```
┌─────────────────────────────────────────┐
│  Capacity Settings                      │
│  ─────────────────────────────────────  │
│  Default Max Orders/Day: [100]          │
│                                         │
│  Blackout Dates:                        │
│  • Dec 25, 2025 (Christmas)             │
│  • Jan 1, 2026 (New Year)               │
│  [+ Add Blackout Date]                  │
└─────────────────────────────────────────┘
```

---

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/florist/dashboard` | GET | Overview stats |
| `/florist/orders` | GET | List orders by date/property |
| `/florist/orders/:id` | GET | Order details |
| `/florist/orders/:id/fulfill` | POST | Mark order fulfilled |
| `/florist/properties` | GET | Assigned properties |
| `/florist/capacity` | GET/PUT | Manage capacity settings |
| `/florist/catalog` | GET | Synced Shopify products |

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Simple order list by delivery date
2. Property grouping
3. Basic fulfillment confirmation
4. Order count dashboard

### Phase 2: Enhanced
1. Delivery calendar view
2. Order export (CSV/PDF)
3. Capacity management
4. Email notifications for new orders

### Phase 3: Advanced
1. Shopify order creation integration
2. Delivery tracking
3. Performance analytics
4. Multi-location support

---

## What Florists Should NOT Control

Based on Bloom's model:
- ❌ Pricing (managed in Shopify)
- ❌ Delivery schedule (property-level)
- ❌ Customer communication
- ❌ Subscription management
- ❌ Property assignment (Bloom admin controls)

---

## Notification Patterns

### Email Notifications to Florists
1. **New Orders Generated** - X days before delivery
2. **Order Reminder** - 1 day before delivery
3. **Capacity Warning** - When approaching max orders

### In-App Notifications
- New orders badge
- Upcoming delivery countdown
- Unfulfilled order alerts

---

## Sources

- [Hana Florist POS](https://www.hanafloristpos.com)
- [FloristWare](https://www.floristware.com/)
- [Floranext](https://floranext.com/)
- [QuickFlora](https://www.quickflora.com/free-florist-software)
- [Orderry Floral Software](https://orderry.com/floral-software/)
- [JungleWorks Flower Delivery](https://jungleworks.com/services/flower-delivery-management-software/)

*Content was rephrased for compliance with licensing restrictions*
