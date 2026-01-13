# Customer Account Dashboard Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on best practices for subscription-based customer dashboards, specifically for Bloom's property-based floral subscription platform.

---

## Industry Sources Reviewed

### Subscription Management Platforms
- **Stripe Customer Portal** - Self-service subscription management
- **Chargebee** - Subscription box billing and management
- **Bold Commerce** - Shopify subscription customer portals

### Flower Subscription Services
- **FLOWERBX** - Luxury flower subscriptions (UK/US)
- **UrbanStems** - Seasonal flower subscriptions
- **Bouqs Co.** - Monthly flower subscriptions
- **Arena Flowers** - Ethical flower subscriptions
- **Wild at Heart** - Luxury flower delivery subscriptions
- **Molly Oliver Flowers** - Local sustainable floral subscriptions

### UX Design Resources
- Adam Fard Studio - Dashboard UI Design Best Practices
- Justinmind - Dashboard Design Best Practices
- Baymard Institute - Consumables Subscription Services UX
- Pencil & Paper - Dashboard UX Patterns

---

## Key Findings

### Standard Subscription Portal Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Subscription Status | View current plan status (active/paused/cancelled) | Essential |
| Pause/Resume | Temporarily pause without cancelling | Essential |
| Skip Delivery | Skip individual upcoming deliveries | Essential |
| Upgrade Orders | One-time upgrades for individual deliveries | High |
| Payment Methods | Update credit card or payment info | Essential |
| Billing History | View past invoices and charges | High |
| Delivery Address | Update delivery location | Essential |
| Notification Preferences | Control email/SMS communications | Medium |
| Cancel Subscription | Self-service cancellation | Essential |

### Common Page Structure

Most subscription services organize their customer portals into 3-5 main sections:

#### 1. Dashboard/Home (Overview)
- Subscription status at a glance
- Next delivery date/countdown
- Quick action buttons
- Recent activity summary

#### 2. Subscription Management
- Current plan details
- Pause/resume controls
- Cancel option
- Plan change options (if applicable)

#### 3. Deliveries/Orders
- Upcoming deliveries list
- Skip individual deliveries
- Upgrade options
- Past delivery history
- Delivery tracking

#### 4. Account/Settings
- Profile information
- Delivery address
- Notification preferences
- Password/security

#### 5. Billing (often combined with Account)
- Payment method on file
- Invoice history
- Billing address

---

## Flower Subscription Specific Patterns

### From FLOWERBX
> "Within your account portal... allowing you to skip, pause, and upgrade your deliveries in just a few clicks"
> "You will also be able to upgrade, skip, pause, or cancel your order 48 hours before the billing date"

### From UrbanStems
> "Log into your subscriptions dashboard and choose the skip option. It's as easy as a click to take a break from your next delivery."

### From Bouqs Co.
> "You can also easily skip an order when you need to... cancel at any time online in your Subscription Dashboard"

### From Arena Flowers
> "Pause, skip or change your subscription frequency whenever you like"

### Key Takeaways for Flower Subscriptions
1. **Skip functionality is critical** - Customers expect to skip individual deliveries easily
2. **Pause vs Cancel distinction** - Pause allows temporary breaks without losing subscription
3. **Upgrade options** - One-time upgrades for special occasions
4. **48-hour cutoff** - Common pattern for changes before billing/delivery
5. **Delivery-centric language** - "Deliveries" resonates better than "Orders" for recurring services

---

## Recommendations for Bloom

### Proposed Page Structure

Given Bloom's unique model (property-based, one cadence per property, Bloom controls florist assignment):

#### Page 1: Home (`/customer`)
**Purpose:** At-a-glance overview and quick actions

**Features:**
- Welcome message with property name
- Subscription status card (ACTIVE/PAUSED pill)
- Next delivery date with countdown
- Quick action: Skip next delivery
- Quick action: Pause/Resume subscription
- Recent delivery summary (last 1-2)

#### Page 2: Subscription (`/customer/subscription`)
**Purpose:** Detailed subscription management

**Features:**
- Current subscription status with visual indicator
- Subscription plan details (what's included)
- Property delivery schedule (read-only - set by property)
- Pause/Resume subscription controls
- Cancel subscription option (with confirmation)
- Subscription start date and history

#### Page 3: Deliveries (`/customer/deliveries`)
**Purpose:** Manage upcoming and view past deliveries

**Features:**
- Upcoming deliveries list with dates
- Skip individual delivery button (with cutoff warning)
- Upgrade individual delivery option (one-time add-ons)
- Past delivery history with details
- Delivery status tracking (if applicable)

#### Page 4: Account (`/customer/account`)
**Purpose:** Profile, billing, and preferences

**Features:**
- Profile information (name, email)
- Unit/apartment number within property
- Notification preferences (email, SMS)
- Payment method on file
- Invoice/billing history
- Password change
- Logout

### Why "Deliveries" Instead of "Orders"

For recurring subscription services like flower delivery:
1. Customers think in terms of "when is my next delivery" not "what's my next order"
2. Industry leaders (FLOWERBX, UrbanStems) use delivery-centric language
3. Aligns with skip/pause mental model
4. "Orders" implies one-time purchases; "Deliveries" implies ongoing relationship

### Why Combine Billing into Account

For MLP (Minimum Lovable Product):
1. Reduces navigation complexity (4 pages vs 5)
2. Billing is typically a secondary concern for active subscribers
3. Payment method + invoices fit naturally under account settings
4. Can be split into separate page later if billing complexity grows

---

## UX Best Practices Applied

### From Research

1. **Be upfront and clear** - Show subscription details prominently
2. **Strong CTAs** - Prominent buttons for key actions
3. **Simple forms** - Minimal input required for changes
4. **Accessible filters** - Easy to find skip/pause options
5. **Transparency** - Clear about cutoff dates and terms
6. **Self-service focus** - Reduce support workload

### Bloom-Specific Considerations

1. **Property-based model** - Delivery schedule is property-level, not customizable
2. **Florist assignment** - Bloom controls this, not shown to customers
3. **Onboarding integration** - Dashboard should guide incomplete onboarding
4. **Premium UX** - Polished, calm aesthetic per brand guidelines

---

## API Endpoints Needed

Based on the proposed structure, these endpoints would be required:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/me` | GET | Get current user with property name |
| `/me/subscription` | PATCH | Update subscription status (pause/resume) |
| `/me/deliveries` | GET | List upcoming and past deliveries |
| `/me/deliveries/:id/skip` | POST | Skip a specific delivery |
| `/me/deliveries/:id/upgrade` | POST | Upgrade a specific delivery |
| `/me/profile` | PATCH | Update profile information |
| `/me/payment-method` | GET/PUT | Manage payment method |
| `/me/invoices` | GET | List billing history |

---

## Implementation Priority

### Phase 1: MLP (Current `customer-dashboard-v1`)
- Home page with status and quick actions
- Basic pause/resume functionality
- Property name display

### Phase 2: Full Dashboard
- Subscription management page
- Deliveries page with skip functionality
- Account page with profile management

### Phase 3: Enhanced Features
- Delivery upgrades
- Payment method management
- Invoice history
- Notification preferences

---

## Sources

- [Stripe Customer Portal Documentation](https://docs.stripe.com/customer-management)
- [Chargebee Self-Service Portal](https://www.chargebee.com/subscription-management/customer-self-service-portal/)
- [FLOWERBX Subscriptions](https://www.flowerbx.com/us/flowers/flower-subscriptions)
- [UrbanStems Subscriptions](https://urbanstems.com/products/seasonal-flower-subscription)
- [Bouqs Subscriptions](https://bouqs.com/subscriptions)
- [Baymard Institute - Subscription Services UX](https://baymard.com/blog/new-research-consumables-subscription-services)
- [CCBill - Subscription UX Best Practices](https://ccbill.com/blog/subscription-ux-best-practices)
- [Blubolt - Subscriptions UX Design](https://blubolt.com/insights/11-best-practices-for-subscriptions-ux-design)

*Content was rephrased for compliance with licensing restrictions*
