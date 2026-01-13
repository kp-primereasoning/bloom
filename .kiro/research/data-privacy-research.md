# Data Privacy Basics Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on data privacy requirements (GDPR, CCPA) for the Bloom platform.

---

## Key Regulations

### GDPR (General Data Protection Regulation)
- **Scope**: EU/EEA residents
- **Effective**: May 2018
- **Applies to Bloom**: If serving EU customers

### CCPA/CPRA (California Consumer Privacy Act)
- **Scope**: California residents
- **Effective**: January 2020 (CPRA updates 2023)
- **Applies to Bloom**: If serving CA customers

---

## GDPR Requirements Summary

### Lawful Basis for Processing
1. **Consent**: User explicitly agrees
2. **Contract**: Necessary for service delivery
3. **Legitimate Interest**: Business need, balanced with user rights

### For Bloom
- **Subscription data**: Contract basis (needed to deliver service)
- **Marketing emails**: Consent basis (opt-in required)
- **Analytics**: Legitimate interest (with opt-out)

### User Rights (GDPR)
| Right | Description | Bloom Action |
|-------|-------------|--------------|
| Access | View their data | Export feature |
| Rectification | Correct errors | Edit profile |
| Erasure | Delete data | Account deletion |
| Portability | Get data in portable format | Data export |
| Object | Stop processing | Unsubscribe, delete |

---

## CCPA Requirements Summary

### Consumer Rights
1. **Right to Know**: What data is collected
2. **Right to Delete**: Request deletion
3. **Right to Opt-Out**: Of data sale
4. **Right to Non-Discrimination**: Equal service

### For Bloom
- Bloom likely does NOT sell data
- Still must provide deletion mechanism
- Must disclose data practices

### "Do Not Sell" Requirement
- If Bloom shares data with third parties for value
- Must provide opt-out mechanism
- Link in footer: "Do Not Sell My Personal Information"

---

## Data Bloom Collects

### Personal Data
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Name | Account, delivery | Active + 3 years |
| Email | Account, communication | Active + 3 years |
| Address | Delivery | Active + 3 years |
| Phone | Communication (optional) | Active + 3 years |
| Payment info | Billing (via Stripe) | Stripe handles |

### Usage Data
| Data Type | Purpose | Retention |
|-----------|---------|-----------|
| Login history | Security | 1 year |
| Order history | Service, analytics | Active + 7 years |
| Preferences | Personalization | Active account |

---

## Privacy Policy Requirements

### Must Include
1. **What data collected**: Categories and specifics
2. **How data used**: Purposes of processing
3. **Who data shared with**: Third parties
4. **User rights**: How to exercise them
5. **Contact info**: Privacy inquiries
6. **Updates**: How policy changes communicated

### Bloom Privacy Policy Outline
```
1. Introduction
2. Data We Collect
   - Account information
   - Subscription data
   - Usage data
3. How We Use Your Data
   - Service delivery
   - Communication
   - Improvement
4. Data Sharing
   - Service providers (Stripe, AWS)
   - Florists (delivery info only)
5. Your Rights
   - Access, correction, deletion
   - How to exercise
6. Data Security
7. Data Retention
8. Children's Privacy
9. Changes to Policy
10. Contact Us
```

---

## Data Deletion Process

### User Request Flow
```
1. User requests deletion (email or dashboard)
2. Verify identity
3. Check for legal holds (billing disputes, etc.)
4. Delete or anonymize data
5. Confirm deletion to user
6. Retain audit log of deletion
```

### What to Delete
- Personal identifiers (name, email, address)
- Account preferences
- Communication history

### What to Retain (Anonymized)
- Aggregated analytics
- Financial records (legal requirement)
- Fraud prevention data

### Timeline
- GDPR: 30 days to respond
- CCPA: 45 days to respond

---

## Data Export (Portability)

### Export Format
- JSON or CSV
- Machine-readable
- Include all personal data

### Export Contents
```json
{
  "account": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "created_at": "2025-01-01"
  },
  "subscription": {
    "status": "active",
    "plan": "bi-weekly",
    "started_at": "2025-01-15"
  },
  "orders": [
    {
      "date": "2025-01-17",
      "status": "delivered"
    }
  ],
  "preferences": {
    "email_notifications": true
  }
}
```

---

## Cookie Consent

### Requirements
- **GDPR**: Consent before non-essential cookies
- **CCPA**: Disclosure of tracking

### Cookie Categories
| Category | Examples | Consent |
|----------|----------|---------|
| Essential | Session, auth | Not required |
| Functional | Preferences | Recommended |
| Analytics | Google Analytics | Required (GDPR) |
| Marketing | Ad tracking | Required |

### Cookie Banner
```
┌─────────────────────────────────────────────────────────┐
│ 🍪 We use cookies                                       │
│                                                         │
│ We use essential cookies for the site to function.     │
│ We'd also like to use analytics cookies to improve     │
│ your experience.                                        │
│                                                         │
│ [Accept All]  [Essential Only]  [Manage Preferences]   │
└─────────────────────────────────────────────────────────┘
```

---

## Third-Party Data Sharing

### Bloom's Third Parties
| Partner | Data Shared | Purpose |
|---------|-------------|---------|
| Stripe | Payment info | Billing |
| AWS (Cognito) | Auth data | Authentication |
| AWS (SES) | Email | Communication |
| Florists | Name, unit, property | Delivery |

### Data Processing Agreements
- Required with all processors
- Defines data handling obligations
- Ensures compliance chain

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Basic privacy policy
2. Account deletion (manual process)
3. Email unsubscribe
4. Essential cookies only

### Phase 2: Compliance
1. Self-service data export
2. Self-service account deletion
3. Cookie consent banner
4. Privacy preference center

### Phase 3: Advanced
1. Automated data retention
2. Consent management platform
3. Privacy impact assessments
4. Regular compliance audits

---

## Data Model Additions

```
UserPrivacy
├── user_id
├── marketing_consent: boolean
├── analytics_consent: boolean
├── consent_updated_at: datetime
└── deletion_requested_at: datetime?

DataDeletionRequest
├── id
├── user_id
├── requested_at: datetime
├── completed_at: datetime?
├── status: pending | completed | rejected
└── notes: string?

ConsentLog
├── id
├── user_id
├── consent_type: string
├── granted: boolean
├── timestamp: datetime
└── ip_address: string
```

---

## Quick Compliance Checklist

### Privacy Policy
- [ ] Published and accessible
- [ ] Covers all data practices
- [ ] Updated when practices change

### User Rights
- [ ] Data access mechanism
- [ ] Data deletion mechanism
- [ ] Unsubscribe from marketing

### Consent
- [ ] Marketing opt-in (not pre-checked)
- [ ] Cookie consent (if using analytics)
- [ ] Clear consent records

### Security
- [ ] Data encrypted in transit (HTTPS)
- [ ] Data encrypted at rest
- [ ] Access controls implemented

---

## Sources

- GDPR official text and guidance
- CCPA/CPRA official text
- Industry privacy policy examples
- Data protection best practices

*Content was rephrased for compliance with licensing restrictions*
