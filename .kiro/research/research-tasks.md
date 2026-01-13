# Bloom Platform Research Tasks

## Overview

This document tracks research topics needed to inform product decisions, technical architecture, and feature development for the Bloom platform.

**Last Updated:** December 30, 2025

---

## Research Task List

### Category 1: User Experience & Dashboards

- [x] 1.1 Customer Account Dashboard Patterns
  - Subscription portal best practices
  - Page structure (Home, Subscription, Deliveries, Account)
  - Skip/pause/upgrade UX patterns
  - _Output: `.kiro/research/account-dashboard-research.md`_

- [x] 1.2 Property Manager Dashboard Patterns
  - What metrics do PMs need to see?
  - Resident participation visibility
  - Property-level rewards/incentives display
  - Comparison with property management software dashboards
  - _Output: `.kiro/research/pm-dashboard-research.md`_

- [x] 1.3 Florist Portal/Dashboard Patterns
  - Order management interfaces
  - Delivery scheduling views
  - Inventory/capacity management
  - Multi-location florist patterns
  - _Output: `.kiro/research/florist-portal-research.md`_

- [x] 1.4 Admin Operations Dashboard Patterns
  - Platform health metrics
  - Property activation workflows
  - Florist assignment interfaces
  - Supply/demand balancing tools
  - _Output: `.kiro/research/admin-dashboard-research.md`_

---

### Category 2: Core Integrations

- [x] 2.1 Shopify Integration Patterns
  - OAuth 2.0 flow for connecting stores
  - Storefront API vs Admin API usage
  - Product/catalog sync strategies
  - Webhook handling for inventory updates
  - Multi-store management patterns
  - _Output: `.kiro/research/shopify-integration-research.md`_

- [x] 2.2 Payment Processing for Subscriptions
  - Stripe Billing vs Stripe Subscriptions
  - Recurring payment best practices
  - Failed payment handling (dunning)
  - Proration for plan changes
  - Invoice generation
  - _Output: `.kiro/research/payment-processing-research.md`_

- [x] 2.3 Email/Notification Services
  - Transactional email patterns (AWS SES)
  - Delivery reminder timing
  - Order confirmation templates
  - Subscription status change notifications
  - SMS notification options
  - _Output: `.kiro/research/email-notifications-research.md`_

---

### Category 3: Business Logic

- [x] 3.1 Subscription Pricing Models
  - Flat rate vs tiered pricing
  - Property-level vs individual pricing
  - Promotional/discount structures
  - Free trial patterns
  - _Output: `.kiro/research/subscription-pricing-research.md`_

- [x] 3.2 Delivery Scheduling & Cadence Management
  - Weekly/bi-weekly/monthly patterns
  - Holiday/blackout date handling
  - Delivery window management
  - Property-level schedule configuration
  - _Output: `.kiro/research/delivery-scheduling-research.md`_

- [x] 3.3 Order Fulfillment Workflows
  - Order generation from subscriptions
  - Florist order routing
  - Delivery confirmation flows
  - Issue/complaint handling
  - _Output: `.kiro/research/order-fulfillment-research.md`_

---

### Category 4: Operations & Growth

- [x] 4.1 Subscription Retention & Churn Reduction
  - Pause vs cancel patterns
  - Win-back campaigns
  - Engagement metrics
  - Loyalty/rewards programs
  - _Output: `.kiro/research/subscription-retention-research.md`_

- [x] 4.2 Florist Onboarding Best Practices
  - Marketplace florist onboarding patterns
  - Capacity/coverage verification
  - Quality standards communication
  - Contract/agreement templates
  - _Output: `.kiro/research/florist-onboarding-research.md`_

- [x] 4.3 Property Activation Workflows
  - Property manager outreach
  - Resident communication templates
  - Launch checklist patterns
  - Success metrics for new properties
  - _Output: `.kiro/research/property-activation-research.md`_

---

### Category 5: Technical Architecture

- [x] 5.1 AWS Cognito Authentication Patterns
  - Custom attributes for roles
  - Token refresh strategies
  - MFA implementation
  - Social login options
  - _Output: `.kiro/research/cognito-authentication-research.md`_

- [x] 5.2 Real-time Updates Architecture
  - Polling vs WebSockets trade-offs
  - Order status update patterns
  - Notification delivery mechanisms
  - AWS AppSync consideration
  - _Output: `.kiro/research/realtime-updates-research.md`_

---

### Category 6: Compliance & Legal

- [x] 6.1 Subscription Billing Regulations
  - Auto-renewal disclosure requirements
  - Cancellation flow requirements
  - State-specific laws (California, etc.)
  - Clear pricing display requirements
  - _Output: `.kiro/research/billing-compliance-research.md`_

- [x] 6.2 Data Privacy Basics
  - GDPR applicability
  - CCPA requirements
  - Data retention policies
  - User data export/deletion
  - _Output: `.kiro/research/data-privacy-research.md`_

---

## Priority Matrix

| Priority | Research Topic | Reason |
|----------|---------------|--------|
| **P0 - MLP Critical** | 2.1 Shopify Integration | Core to florist catalog functionality |
| **P0 - MLP Critical** | 2.2 Payment Processing | Required for subscriptions |
| **P0 - MLP Critical** | 3.3 Order Fulfillment | Core business flow |
| **P1 - High** | 1.2 PM Dashboard | PM visibility needed for activation |
| **P1 - High** | 1.3 Florist Portal | Florists need to fulfill orders |
| **P1 - High** | 3.2 Delivery Scheduling | Core to subscription model |
| **P2 - Medium** | 2.3 Email/Notifications | Important but can start simple |
| **P2 - Medium** | 1.4 Admin Dashboard | Needed for operations |
| **P2 - Medium** | 6.1 Billing Regulations | Legal compliance |
| **P3 - Lower** | 4.1-4.3 Operations | Post-MLP optimization |
| **P3 - Lower** | 5.1-5.2 Technical | Can use defaults initially |
| **P3 - Lower** | 6.2 Data Privacy | Basic compliance first |

---

## Completed Research

| Date | Topic | Output File |
|------|-------|-------------|
| 2025-12-30 | Customer Account Dashboard | `account-dashboard-research.md` |
| 2025-12-30 | Property Manager Dashboard | `pm-dashboard-research.md` |
| 2025-12-30 | Florist Portal/Dashboard | `florist-portal-research.md` |
| 2025-12-30 | Admin Operations Dashboard | `admin-dashboard-research.md` |
| 2025-12-30 | Shopify Integration | `shopify-integration-research.md` |
| 2025-12-30 | Payment Processing | `payment-processing-research.md` |
| 2025-12-30 | Email/Notifications | `email-notifications-research.md` |
| 2025-12-30 | Subscription Pricing | `subscription-pricing-research.md` |
| 2025-12-30 | Delivery Scheduling | `delivery-scheduling-research.md` |
| 2025-12-30 | Order Fulfillment | `order-fulfillment-research.md` |
| 2025-12-30 | Subscription Retention | `subscription-retention-research.md` |
| 2025-12-30 | Florist Onboarding | `florist-onboarding-research.md` |
| 2025-12-30 | Property Activation | `property-activation-research.md` |
| 2025-12-30 | AWS Cognito Authentication | `cognito-authentication-research.md` |
| 2025-12-30 | Real-time Updates | `realtime-updates-research.md` |
| 2025-12-30 | Billing Compliance | `billing-compliance-research.md` |
| 2025-12-30 | Data Privacy | `data-privacy-research.md` |

---

## Research Template

When completing a research task, create a markdown file with:

1. **Research Date**
2. **Overview** - What question are we answering?
3. **Sources Reviewed** - List of sources consulted
4. **Key Findings** - Summarized insights
5. **Recommendations for Bloom** - How findings apply to our platform
6. **Implementation Considerations** - Technical/design implications
7. **Sources** - Full citations

---

## Notes

- Research should inform specs, not replace them
- ✅ All 17 research topics completed on 2025-12-30
- Document decisions and rationale
- Research is ready to inform spec development
