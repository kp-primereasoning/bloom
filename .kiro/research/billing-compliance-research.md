# Subscription Billing Regulations Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on subscription billing regulations and compliance requirements for the Bloom platform.

---

## Key Regulations

### Federal: ROSCA (Restore Online Shoppers Confidence Act)
- Applies to all online negative option/subscription sales
- Enforced by FTC
- Covers goods and services

### State: California Automatic Renewal Law (ARL)
- Strictest state law
- Model for other states
- Applies to CA residents

### Other States
- New York, Illinois, Virginia, and others have similar laws
- Patchwork of requirements
- Best practice: Comply with strictest (California)

---

## ROSCA Requirements

### 1. Clear and Conspicuous Disclosures
Before obtaining billing information, disclose:
- **Price**: Total cost and billing frequency
- **Renewal terms**: When and how subscription renews
- **Cancellation**: How to cancel the subscription

### 2. Express Informed Consent
- Customer must affirmatively agree to terms
- Pre-checked boxes are NOT sufficient
- Consent must be separate from other terms

### 3. Simple Cancellation Mechanism
- Easy to find and use
- Cannot be harder than sign-up
- Must be effective immediately or as disclosed

---

## California ARL Requirements

### Disclosure Requirements
1. **Clear and conspicuous** presentation of:
   - Automatic renewal terms
   - Cancellation policy
   - Recurring charges

2. **Affirmative consent** to:
   - Automatic renewal terms
   - Continuous service terms

3. **Acknowledgment** provided to customer:
   - Written or electronic confirmation
   - Includes renewal terms
   - Includes cancellation procedure

### "Click to Cancel" (AB 2863 - Effective July 2025)
- Cancellation must be as easy as sign-up
- Online sign-up = online cancellation option
- No phone calls required if signed up online
- Immediate cancellation processing

---

## Compliance Checklist for Bloom

### Sign-Up Flow
- [ ] Display subscription price clearly
- [ ] Show billing frequency (monthly, per delivery)
- [ ] Explain automatic renewal terms
- [ ] Describe cancellation process
- [ ] Require explicit checkbox for terms (not pre-checked)
- [ ] Send confirmation email with all terms

### Subscription Management
- [ ] Easy-to-find cancel button in dashboard
- [ ] Online cancellation (no phone required)
- [ ] Immediate cancellation processing
- [ ] Confirmation of cancellation
- [ ] No dark patterns or guilt trips

### Renewal Notifications
- [ ] Notify before renewal (recommended: 7 days)
- [ ] Include renewal amount
- [ ] Include cancellation instructions
- [ ] Provide easy cancellation link

---

## Disclosure Language Examples

### Sign-Up Page
```
SUBSCRIPTION TERMS

By clicking "Subscribe," you agree to:

• Pay $XX per delivery, billed monthly
• Your subscription will automatically renew each month
• You may cancel anytime from your account dashboard
• Cancellation takes effect at end of current billing period

□ I agree to the subscription terms above (required)

[Subscribe]
```

### Confirmation Email
```
Subject: Your Bloom Subscription is Active

Hi [Name],

Thank you for subscribing to Bloom!

SUBSCRIPTION DETAILS
• Plan: [Plan Name]
• Price: $XX per delivery
• Billing: Monthly on the [X]th
• First delivery: [Date]

AUTOMATIC RENEWAL
Your subscription will automatically renew each month 
until you cancel. You will be charged $XX monthly.

HOW TO CANCEL
You can cancel anytime by:
1. Logging into your account at bloom.app
2. Going to Account > Subscription
3. Clicking "Cancel Subscription"

Questions? Contact us at support@bloom.app

The Bloom Team
```

### Pre-Renewal Reminder
```
Subject: Your Bloom subscription renews in 7 days

Hi [Name],

Your Bloom subscription will renew on [Date].

RENEWAL DETAILS
• Amount: $XX
• Next delivery: [Date]

Want to make changes?
• Skip next delivery: [Link]
• Pause subscription: [Link]
• Cancel subscription: [Link]

The Bloom Team
```

---

## Dark Patterns to Avoid

### Prohibited Practices
1. **Hidden cancellation**: Burying cancel option
2. **Confirm-shaming**: Guilt-inducing cancel language
3. **Forced phone calls**: Requiring call to cancel online signup
4. **Endless loops**: Redirecting away from cancellation
5. **Fake urgency**: False scarcity or time pressure
6. **Pre-checked boxes**: Auto-opting into renewal

### Good Practices
1. **Clear cancel button**: Visible in account settings
2. **Neutral language**: "Cancel subscription" not "Give up"
3. **Simple flow**: 2-3 clicks maximum
4. **Confirmation**: Clear confirmation of cancellation
5. **No barriers**: No surveys required to cancel

---

## Cancellation Flow Best Practices

### Compliant Flow
```
1. User clicks "Cancel Subscription"
   ↓
2. "Are you sure?" with options:
   - [Pause Instead] (optional alternative)
   - [Continue Cancellation]
   ↓
3. Optional: "Help us improve" (skippable survey)
   ↓
4. Confirmation: "Your subscription has been cancelled"
   - Effective date
   - What happens next
   - How to resubscribe
```

### What NOT to Do
```
❌ "Call us to cancel"
❌ "Chat with an agent to cancel"
❌ "Are you SURE you want to miss out?"
❌ Required 10-question survey
❌ Hidden cancel button
❌ "Cancel" leads to "Contact Us"
```

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Clear pricing display on sign-up
2. Explicit consent checkbox (not pre-checked)
3. Confirmation email with all terms
4. Simple cancel button in dashboard
5. Immediate cancellation processing

### Phase 2: Enhanced
1. Pre-renewal reminder emails (7 days)
2. Cancellation confirmation email
3. Optional pause alternative in cancel flow
4. Feedback collection (skippable)

### Phase 3: Compliance Audit
1. Legal review of all flows
2. State-by-state compliance check
3. Regular policy updates
4. Documentation for audits

---

## Data Retention After Cancellation

### Requirements
- Keep records of consent
- Keep cancellation records
- Retain for statute of limitations (varies by state)

### Recommended Retention
```
ConsentRecord
├── user_id
├── consent_type: "subscription_terms"
├── consent_text: (full text agreed to)
├── consented_at: datetime
├── ip_address
└── user_agent

CancellationRecord
├── user_id
├── cancelled_at: datetime
├── effective_date: date
├── reason: string?
└── confirmation_sent: boolean
```

---

## Penalties for Non-Compliance

### FTC Enforcement
- Civil penalties up to $50,000 per violation
- Injunctive relief
- Consumer redress

### California ARL
- Civil penalties
- Consumer lawsuits
- Class action exposure

### Reputational Risk
- Negative press
- Customer complaints
- App store issues

---

## Sources

- [American Bar Association - ROSCA and California ARL](https://www.americanbar.org/groups/business_law/resources/business-law-today/2022-august/let-em-out-rosca/)
- [FTC Attorney - Automatic Renewal Compliance](https://ftcattorney.com/internet-marketing-compliance-with-automatic-renewal-laws/)
- [Tauler Smith - Federal Law on Automatic Renewals](https://www.taulersmith.com/federal-law-on-automatic-renewals/)
- [ProsperStack - ROSCA Compliance Guide](https://prosperstack.com/blog/restore-online-shoppers-confidence-act/)
- [National Law Review - California ARL Expansion](https://natlawreview.com/article/california-expands-automatic-renewal-legislation)
- [ProsperStack - California Click to Cancel](https://prosperstack.com/blog/california-automatic-renewal-law/)

*Content was rephrased for compliance with licensing restrictions*
