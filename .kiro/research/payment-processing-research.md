# Payment Processing for Subscriptions Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on implementing subscription billing using Stripe for the Bloom platform.

---

## Stripe Billing Overview

Stripe Billing is the recommended solution for subscription management, offering:
- Recurring payment automation
- Invoice generation
- Dunning management (failed payment recovery)
- Customer portal for self-service
- Proration for plan changes

---

## Subscription Lifecycle

### 1. Creation
- Customer selects subscription plan
- Stripe creates subscription object
- First invoice generated and charged

### 2. Recurring Billing
- Stripe automatically generates invoices at billing interval
- Attempts payment on due date
- Sends receipts on successful payment

### 3. Failed Payments (Dunning)
- Smart Retries: AI-powered retry scheduling
- Customizable retry rules
- Email notifications to customers
- Grace period before subscription cancellation

### 4. Updates
- Plan changes (upgrade/downgrade)
- Proration calculations
- Payment method updates

### 5. Cancellation
- Immediate or end-of-period
- Refund handling

---

## Dunning Management

### What is Dunning?
Process of communicating with customers about failed payments and recovering revenue.

### Stripe Smart Retries
- Machine learning optimizes retry timing
- Considers card type, bank patterns, time of day
- Can recover 10-15% of failed payments

### Dunning Best Practices
1. **Pre-dunning**: Notify before card expiration
2. **Immediate notification**: Email on first failure
3. **Multiple attempts**: 3-4 retries over 2-3 weeks
4. **Clear messaging**: Explain issue and how to fix
5. **Easy update**: Direct link to update payment method

### Stripe Dunning Configuration
```
- Number of retry attempts: 4
- Days between retries: 3, 5, 7
- Mark uncollectible after: 21 days
- Send customer emails: Yes
```

---

## Subscription Pricing Models

### For Bloom (Property-Based Subscriptions)

| Model | Description | Bloom Fit |
|-------|-------------|-----------|
| Flat Rate | Single price for all | ✅ Simple, good for MLP |
| Tiered | Different price levels | ⚠️ Future consideration |
| Per-Unit | Price × quantity | ❌ Not applicable |
| Usage-Based | Pay for what you use | ❌ Not applicable |

### Recommended: Flat Rate for MLP
- Single subscription price per property
- Easy to understand for customers
- Simple billing logic
- Can add tiers later (Premium arrangements, etc.)

---

## Stripe Integration Architecture

### Key Stripe Objects
```
Customer
├── email, name, metadata
└── default_payment_method

Subscription
├── customer_id
├── price_id (plan)
├── status (active, paused, canceled)
└── current_period_start/end

Invoice
├── subscription_id
├── amount_due
├── status (draft, open, paid, uncollectible)
└── payment_intent

PaymentMethod
├── type (card)
├── card details
└── billing_details
```

### Webhook Events to Handle
```
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
invoice.upcoming
payment_method.attached
```

---

## Customer Self-Service Portal

### Stripe Customer Portal Features
- Update payment methods
- View billing history
- Download invoices
- Cancel subscription
- Update billing address

### Integration
```javascript
// Create portal session
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://bloom.app/customer/account',
});
// Redirect to session.url
```

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Stripe Checkout for initial subscription
2. Basic webhook handling (subscription created/updated)
3. Store Stripe customer_id in Bloom database
4. Simple subscription status sync

### Phase 2: Enhanced
1. Customer Portal integration
2. Full dunning email customization
3. Invoice history in Bloom dashboard
4. Proration for plan changes

### Phase 3: Advanced
1. Multiple payment methods
2. Promotional pricing/coupons
3. Usage-based add-ons (upgrades)
4. Revenue analytics

---

## Data Model Considerations

```
User
├── stripe_customer_id
└── subscription_status (synced from Stripe)

Property
├── stripe_price_id (subscription plan)
└── billing_anchor_day

SubscriptionEvent (audit log)
├── user_id
├── event_type
├── stripe_event_id
└── created_at
```

---

## Security & Compliance

### PCI Compliance
- Use Stripe Elements or Checkout (PCI DSS compliant)
- Never handle raw card numbers
- Stripe handles all sensitive data

### Webhook Security
- Verify webhook signatures
- Use webhook endpoint secrets
- Idempotent event handling

---

## Pricing Considerations

### Stripe Fees
- 2.9% + $0.30 per successful charge
- No monthly fees for basic Billing
- Additional fees for advanced features

### For Bloom
- Pass-through to subscription price
- Consider annual billing discount (reduces fees)

---

## Sources

- [Stripe Billing Documentation](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe Recurring Payments](https://docs.stripe.com/recurring-payments)
- [Stripe Smart Retries](https://docs.stripe.com/billing/revenue-recovery/smart-retries)
- [Stripe Dunning Guide](https://stripe.com/resources/more/dunning-what-subscription-based-businesses-need-to-know)
- [Stripe Pricing Models](https://docs.stripe.com/products-prices/pricing-models)

*Content was rephrased for compliance with licensing restrictions*
