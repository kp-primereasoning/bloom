# Subscription Pricing Models Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on subscription pricing models and strategies for the Bloom platform.

---

## Common Pricing Models

### 1. Flat Rate Pricing
**Description**: Single price for access to the entire service

| Pros | Cons |
|------|------|
| Simple to understand | No upsell path |
| Easy to implement | May leave money on table |
| Clear value proposition | One-size-fits-all |

**Best for**: Simple offerings, early-stage products

### 2. Tiered Pricing
**Description**: Multiple price levels with different features/value

| Pros | Cons |
|------|------|
| Captures different segments | More complex |
| Upsell opportunities | Decision paralysis risk |
| Flexible positioning | Requires clear differentiation |

**Best for**: Products with varying feature sets

### 3. Per-Unit Pricing
**Description**: Price multiplied by quantity (seats, users, etc.)

| Pros | Cons |
|------|------|
| Scales with usage | Unpredictable costs |
| Fair for customers | Complex billing |
| Growth-aligned | May discourage adoption |

**Best for**: B2B SaaS, collaboration tools

### 4. Usage-Based Pricing
**Description**: Pay for what you consume

| Pros | Cons |
|------|------|
| Low barrier to entry | Revenue unpredictability |
| Fair pricing | Complex tracking |
| Scales naturally | Customer budget concerns |

**Best for**: APIs, infrastructure, metered services

---

## Bloom's Pricing Considerations

### Business Model Context
- Property-based subscriptions
- One cadence per property
- Florist fulfillment costs
- Premium positioning

### Pricing Dimensions
1. **Delivery frequency**: Weekly, bi-weekly, monthly
2. **Arrangement type**: Standard, premium, luxury
3. **Property size**: Number of units (future)

---

## Recommended Pricing Structure for Bloom

### Option A: Simple Flat Rate (MLP)
```
Bloom Subscription: $XX/delivery

Includes:
• Fresh seasonal arrangement
• Delivery to your building
• Skip or pause anytime
```

**Pros**: Simple, easy to launch
**Cons**: No differentiation, limited upsell

### Option B: Frequency-Based Tiers
```
Weekly Plan:    $XX/week   ($XX/month)
Bi-Weekly Plan: $XX/delivery ($XX/month)
Monthly Plan:   $XX/delivery ($XX/month)
```

**Pros**: Captures different preferences
**Cons**: More complex, may confuse

### Option C: Arrangement Tiers (Recommended)
```
Essential:  $XX/delivery - Seasonal bouquet
Signature:  $XX/delivery - Premium arrangement
Luxe:       $XX/delivery - Designer collection
```

**Pros**: Clear value ladder, upsell path
**Cons**: Requires florist coordination

---

## Pricing Strategy Recommendations

### For MLP: Start Simple
1. **Single price point** for standard arrangement
2. **One-time upgrades** for special occasions
3. **Validate demand** before adding tiers

### Post-MLP: Add Tiers
1. **Good-Better-Best** structure
2. **Clear differentiation** between tiers
3. **Anchor pricing** with premium option

---

## Property-Level vs Individual Pricing

### Current Model: Property-Level
- All residents at property pay same price
- Simplifies florist coordination
- Bulk delivery efficiency

### Future Consideration: Individual Add-ons
- Base subscription at property rate
- Optional upgrades (vase, premium stems)
- One-time special occasion orders

---

## Promotional Pricing

### Trial Offers
| Type | Description | Risk |
|------|-------------|------|
| Free first delivery | Low barrier | Attracts non-buyers |
| Discounted first month | Reduced commitment | Revenue impact |
| No commitment | Cancel anytime | Higher churn |

### Recommended: No Free Trial
- Premium positioning
- Attracts serious customers
- Sustainable unit economics

### Alternative: Money-Back Guarantee
- "Not satisfied? Full refund on first delivery"
- Reduces risk perception
- Maintains premium positioning

---

## Pricing Display Best Practices

### Clarity
- Show price per delivery AND monthly cost
- Include what's included
- No hidden fees

### Anchoring
- Show premium option first
- Highlight "most popular" tier
- Use strikethrough for discounts

### Example Display
```
┌─────────────────────────────────────────┐
│  Choose Your Plan                       │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ LUXE    │  │SIGNATURE│  │ESSENTIAL│ │
│  │ $65     │  │  $45    │  │  $29    │ │
│  │/delivery│  │/delivery│  │/delivery│ │
│  │         │  │ POPULAR │  │         │ │
│  │Designer │  │ Premium │  │Seasonal │ │
│  │arrange- │  │ arrange-│  │ bouquet │ │
│  │ment     │  │  ment   │  │         │ │
│  │         │  │         │  │         │ │
│  │[Select] │  │[Select] │  │[Select] │ │
│  └─────────┘  └─────────┘  └─────────┘ │
└─────────────────────────────────────────┘
```

---

## Billing Considerations

### Billing Frequency
| Option | Pros | Cons |
|--------|------|------|
| Per delivery | Matches value | More transactions |
| Monthly | Predictable | May not match cadence |
| Annual | Lower churn, discount | Higher commitment |

### Recommended: Monthly Billing
- Aligns with subscription mental model
- Predictable for customers
- Standard for subscription services

### Proration
- New subscribers: Charge immediately, prorate first month
- Plan changes: Prorate difference
- Cancellations: No refund for partial month (or prorate)

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Single flat-rate price
2. Monthly billing
3. No tiers or add-ons
4. Simple pricing page

### Phase 2: Tiers
1. 2-3 arrangement tiers
2. Clear feature differentiation
3. Upgrade path in dashboard

### Phase 3: Advanced
1. Annual billing discount
2. Property-level bulk pricing
3. Corporate/enterprise plans
4. Promotional campaigns

---

## Data Model
```
SubscriptionPlan
├── id
├── name: "Essential" | "Signature" | "Luxe"
├── price_per_delivery: decimal
├── description: string
├── features: string[]
└── stripe_price_id: string

PropertySubscriptionConfig
├── property_id
├── available_plans: plan_id[]
├── default_plan_id
└── custom_pricing: boolean
```

---

## Sources

- [NetSuite - Subscription Pricing Models](https://www.netsuite.com/portal/resource/articles/business-strategy/subscription-based-pricing-models.shtml)
- [Paddle - Subscription Pricing Strategies](https://www.paddle.com/blog/subscription-pricing)
- [Stripe - Recurring Pricing Models](https://docs.stripe.com/products-prices/pricing-models)
- [DigitalRoute - Subscription Models](https://www.digitalroute.com/blog/subscription-pricing-models-the-6-most-common-explained/)
- [Firmhouse - Subscription Pricing Strategy](https://firmhouse.com/blog/how-to-set-your-subscription-pricing-strategy)
- [CloudBlue - SaaS Subscription Pricing](https://www.cloudblue.com/blog/saas-subscription-pricing/)

*Content was rephrased for compliance with licensing restrictions*
