# Delivery Scheduling & Cadence Management Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on subscription delivery scheduling and cadence management patterns for the Bloom platform.

---

## Common Delivery Cadences

### Industry Standard Options
| Cadence | Frequency | Use Case |
|---------|-----------|----------|
| Weekly | Every 7 days | High-engagement, fresh products |
| Bi-weekly | Every 14 days | Balanced frequency |
| Monthly | Every 30 days | Lower commitment |
| Custom | Variable | Special arrangements |

### For Bloom (Flower Subscriptions)
- **Weekly**: Fresh flowers, premium experience
- **Bi-weekly**: Most common for flower subscriptions
- **Monthly**: Budget-friendly option

---

## Bloom's Property-Based Model

### Key Constraint
> "One delivery cadence per property (no per-resident customization)"

This means:
- Property manager or Bloom admin sets delivery schedule
- All residents at a property receive deliveries on same day
- Simplifies logistics and florist coordination
- Residents can skip individual deliveries

### Delivery Schedule Configuration
```
Property
├── delivery_cadence: "biweekly" | "weekly" | "monthly"
├── delivery_day_of_week: 0-6 (Sunday-Saturday)
├── delivery_anchor_date: Date (first delivery)
└── blackout_dates: Date[] (holidays, etc.)
```

---

## Delivery Date Calculation

### Algorithm
```python
def get_next_delivery_date(property, from_date):
    anchor = property.delivery_anchor_date
    cadence_days = {
        "weekly": 7,
        "biweekly": 14,
        "monthly": 30
    }[property.delivery_cadence]
    
    # Calculate days since anchor
    days_since = (from_date - anchor).days
    
    # Find next delivery
    periods_passed = days_since // cadence_days
    next_delivery = anchor + (periods_passed + 1) * cadence_days
    
    # Skip blackout dates
    while next_delivery in property.blackout_dates:
        next_delivery += cadence_days
    
    return next_delivery
```

---

## Holiday/Blackout Date Handling

### Common Approaches
1. **Skip**: No delivery on holiday, resume next scheduled date
2. **Shift**: Move delivery to adjacent day
3. **Advance**: Deliver day before holiday

### Recommended for Bloom: Skip
- Simplest to implement
- Clear expectation for customers
- No billing for skipped deliveries

### Standard Blackout Dates (US)
- New Year's Day (Jan 1)
- Memorial Day (last Monday of May)
- Independence Day (July 4)
- Labor Day (first Monday of September)
- Thanksgiving (fourth Thursday of November)
- Christmas Day (Dec 25)

---

## Delivery Window Management

### Options
| Approach | Description | Complexity |
|----------|-------------|------------|
| All-day | Delivery anytime | Simple |
| AM/PM | Morning or afternoon | Medium |
| Time slots | Specific windows | Complex |

### Recommended for Bloom MLP: All-day
- Property receives delivery on scheduled day
- Florist manages their own routing
- Reduces coordination complexity

---

## Skip Delivery Feature

### Customer Actions
- Skip next delivery
- Skip specific future delivery
- Skip multiple consecutive deliveries

### Business Rules
- Cutoff: 48-72 hours before delivery
- No charge for skipped deliveries
- Auto-resume after skip

### Data Model
```
DeliverySkip
├── user_id
├── property_id
├── delivery_date
├── created_at
└── reason (optional)
```

---

## Order Generation Timing

### When to Generate Orders
```
Delivery Date: Friday, Jan 3
├── T-7 days: Generate orders from active subscriptions
├── T-5 days: Send order list to florist
├── T-3 days: Cutoff for customer skips
├── T-1 day: Final order confirmation
└── T-0: Delivery day
```

### Order Generation Logic
```python
def generate_orders_for_delivery(property, delivery_date):
    # Get active subscribers who haven't skipped
    subscribers = get_active_subscribers(property)
    skips = get_skips_for_date(property, delivery_date)
    
    orders = []
    for subscriber in subscribers:
        if subscriber.id not in skips:
            orders.append(create_order(subscriber, delivery_date))
    
    return orders
```

---

## Cadence Change Handling

### Scenarios
1. **Property changes cadence**: Recalculate all future deliveries
2. **Property changes delivery day**: Shift anchor date
3. **New subscriber mid-cycle**: Join next scheduled delivery

### Proration Considerations
- If billing is per-delivery: No proration needed
- If billing is monthly: May need to adjust

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Fixed cadence options (weekly, biweekly, monthly)
2. Single delivery day per property
3. Basic skip functionality (next delivery only)
4. Manual blackout date configuration

### Phase 2: Enhanced
1. Skip any future delivery
2. Automatic holiday blackouts
3. Delivery notifications to customers
4. Florist delivery confirmations

### Phase 3: Advanced
1. Delivery time windows
2. Delivery tracking
3. Rescheduling options
4. Analytics on skip patterns

---

## API Endpoints Needed

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/properties/:id/schedule` | GET | Get delivery schedule |
| `/properties/:id/schedule` | PUT | Update schedule (admin) |
| `/properties/:id/deliveries` | GET | List upcoming deliveries |
| `/me/deliveries` | GET | Customer's upcoming deliveries |
| `/me/deliveries/:date/skip` | POST | Skip a delivery |
| `/me/deliveries/:date/unskip` | DELETE | Cancel a skip |

---

## Data Model Summary

```
Property
├── delivery_cadence: enum
├── delivery_day_of_week: int
├── delivery_anchor_date: date
└── blackout_dates: date[]

Delivery (generated)
├── property_id
├── delivery_date
├── status: pending | in_progress | completed
├── order_count
└── florist_id

DeliverySkip
├── user_id
├── delivery_date
├── created_at
└── reason: string?

Order
├── user_id
├── delivery_id
├── status: pending | fulfilled | delivered
├── upgrades: json
└── notes: string?
```

---

## Sources

- DealHub - Billing Cadence definitions
- SubscriptionFlow - Billing cadence flexibility
- Industry patterns from meeting cadence research (adapted)
- Flower subscription services (FLOWERBX, UrbanStems, Bouqs)

*Content was rephrased for compliance with licensing restrictions*
