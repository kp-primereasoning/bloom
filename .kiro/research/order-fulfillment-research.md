# Order Fulfillment Workflows Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on order fulfillment workflows for subscription-based delivery services, informing Bloom's order management system.

---

## Bloom's Order Flow

### Unique Characteristics
1. **Subscription-generated**: Orders created from active subscriptions
2. **Property-grouped**: Deliveries batched by building
3. **Florist-fulfilled**: External partners prepare arrangements
4. **Scheduled cadence**: Predictable delivery dates

---

## Order Lifecycle

### States
```
PENDING      → Order generated, awaiting florist action
CONFIRMED    → Florist acknowledged order
IN_PROGRESS  → Florist preparing arrangement
FULFILLED    → Arrangement ready for delivery
OUT_FOR_DELIVERY → En route to property
DELIVERED    → Successfully delivered
FAILED       → Delivery failed (returned, refused, etc.)
```

### State Transitions
```
                    ┌─────────────┐
                    │   PENDING   │
                    └──────┬──────┘
                           │ Florist confirms
                    ┌──────▼──────┐
                    │  CONFIRMED  │
                    └──────┬──────┘
                           │ Preparation starts
                    ┌──────▼──────┐
                    │ IN_PROGRESS │
                    └──────┬──────┘
                           │ Ready for pickup
                    ┌──────▼──────┐
                    │  FULFILLED  │
                    └──────┬──────┘
                           │ Out for delivery
                    ┌──────▼──────┐
                    │OUT_FOR_DELIV│
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  DELIVERED  │          │   FAILED    │
       └─────────────┘          └─────────────┘
```

---

## Order Generation Process

### Timing
```
Delivery Date: Friday, Jan 3
├── T-7 days (Dec 27): Generate orders
├── T-5 days (Dec 29): Notify florist
├── T-3 days (Dec 31): Customer skip cutoff
├── T-2 days (Jan 1): Final order count to florist
├── T-1 day (Jan 2): Florist preparation
└── T-0 (Jan 3): Delivery day
```

### Generation Algorithm
```python
def generate_orders_for_delivery(property_id, delivery_date):
    # Get property and florist
    property = get_property(property_id)
    florist = get_assigned_florist(property_id)
    
    # Get active subscribers
    subscribers = get_active_subscribers(property_id)
    
    # Filter out skips
    skips = get_skips(property_id, delivery_date)
    active_subscribers = [s for s in subscribers if s.id not in skips]
    
    # Create delivery record
    delivery = create_delivery(
        property_id=property_id,
        florist_id=florist.id,
        delivery_date=delivery_date,
        status="PENDING"
    )
    
    # Create individual orders
    orders = []
    for subscriber in active_subscribers:
        order = create_order(
            user_id=subscriber.id,
            delivery_id=delivery.id,
            arrangement_type=subscriber.plan,
            status="PENDING"
        )
        orders.append(order)
    
    # Notify florist
    notify_florist_new_orders(florist, delivery, orders)
    
    return delivery, orders
```

---

## Florist Fulfillment Workflow

### 1. Order Receipt
- Florist receives notification of upcoming orders
- Orders grouped by property and delivery date
- Clear count and arrangement types

### 2. Order Confirmation
- Florist reviews order list
- Confirms capacity to fulfill
- Flags any issues (out of stock, etc.)

### 3. Preparation
- Florist prepares arrangements
- Marks orders as in-progress
- Quality check before packaging

### 4. Fulfillment
- All orders for delivery ready
- Florist marks delivery as fulfilled
- Ready for pickup/delivery

### 5. Delivery
- Arrangements delivered to property
- Delivery confirmation (photo, signature, etc.)
- Status updated to delivered

---

## Order Grouping Strategy

### By Property
```
Delivery: Jan 3, 2026
├── Sunset Towers (25 orders)
│   ├── Unit 101: Standard Bouquet
│   ├── Unit 205: Premium + Vase upgrade
│   └── ... (23 more)
├── Harbor View (15 orders)
│   └── ...
└── Park Place (18 orders)
    └── ...
```

### Benefits
- Efficient delivery routing
- Bulk preparation for florist
- Single delivery point per property
- Reduced logistics complexity

---

## Handling Edge Cases

### Customer Skips After Generation
```
If skip requested after orders generated:
1. Check if within cutoff window
2. If yes: Cancel order, update delivery count
3. If no: Reject skip, inform customer
4. Notify florist of updated count
```

### Florist Capacity Issues
```
If florist cannot fulfill:
1. Florist flags issue in portal
2. Admin notified immediately
3. Options:
   a. Reassign to backup florist
   b. Reschedule delivery
   c. Partial fulfillment
4. Affected customers notified
```

### Delivery Failures
```
If delivery fails:
1. Driver marks as failed with reason
2. Options:
   a. Reattempt next day
   b. Hold at property office
   c. Refund/credit customer
3. Customer notified of status
```

---

## Data Model

```
Delivery
├── id: uuid
├── property_id: uuid
├── florist_id: uuid
├── delivery_date: date
├── status: enum
├── order_count: int
├── fulfilled_at: datetime?
├── delivered_at: datetime?
└── notes: string?

Order
├── id: uuid
├── user_id: uuid
├── delivery_id: uuid
├── arrangement_type: string
├── upgrades: json?
├── status: enum
├── special_instructions: string?
└── created_at: datetime

DeliveryEvent (audit log)
├── id: uuid
├── delivery_id: uuid
├── event_type: string
├── actor_id: uuid
├── details: json
└── created_at: datetime
```

---

## Notifications

### To Florist
| Event | Timing | Channel |
|-------|--------|---------|
| New orders generated | T-5 days | Email + Portal |
| Order count updated | On change | Portal |
| Delivery reminder | T-1 day | Email |

### To Customer
| Event | Timing | Channel |
|-------|--------|---------|
| Delivery reminder | T-3 days | Email |
| Delivery day | T-0 | Email |
| Delivered | On delivery | Email (future) |

### To Admin
| Event | Timing | Channel |
|-------|--------|---------|
| Florist capacity issue | Immediate | Email + Dashboard |
| Delivery failure | Immediate | Dashboard |
| Unassigned property | Daily | Dashboard |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/deliveries` | GET | List deliveries (admin/florist) |
| `/deliveries/:id` | GET | Delivery details |
| `/deliveries/:id/confirm` | POST | Florist confirms |
| `/deliveries/:id/fulfill` | POST | Mark fulfilled |
| `/deliveries/:id/deliver` | POST | Mark delivered |
| `/orders` | GET | List orders |
| `/orders/:id` | GET | Order details |
| `/orders/:id/cancel` | POST | Cancel order (admin) |

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Manual order generation (admin triggers)
2. Simple status tracking (Pending → Fulfilled)
3. Basic florist notification
4. Order list in florist portal

### Phase 2: Automated
1. Scheduled order generation (cron job)
2. Full status workflow
3. Automated notifications
4. Skip handling after generation

### Phase 3: Advanced
1. Delivery tracking
2. Photo confirmation
3. Customer delivery notifications
4. Analytics and reporting

---

## Scheduled Jobs

```
Daily Jobs (run at 9:00 AM):
├── generate_orders_for_date(today + 7 days)
├── send_florist_reminders(today + 1 day)
├── send_customer_reminders(today + 3 days)
└── check_unfulfilled_deliveries(today)

Hourly Jobs:
├── process_skip_requests()
└── sync_delivery_statuses()
```

---

## Sources

- Florist software patterns (FloristWare, Floranext, QuickFlora)
- Subscription box fulfillment workflows
- E-commerce order management best practices
- Delivery logistics patterns

*Content was rephrased for compliance with licensing restrictions*
