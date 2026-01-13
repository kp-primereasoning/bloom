# Property Activation Workflows Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on property activation workflows for the Bloom platform, covering the process of bringing new properties live with subscriptions.

---

## Bloom's Property Activation Model

### Key Stakeholders
1. **Bloom Admin**: Initiates and manages activation
2. **Property Manager**: Building contact, promotes to residents
3. **Florist**: Assigned to fulfill orders
4. **Residents**: End customers who subscribe

### Activation Goal
> Property goes live with real subscriptions and fulfilled deliveries

---

## Activation Stages

### Stage 1: Property Acquisition
```
Identify and secure property partnership
├── Outreach to property management
├── Present Bloom value proposition
├── Negotiate terms (if any)
├── Get PM commitment
└── Collect property details
```

### Stage 2: Property Setup
```
Configure property in Bloom system
├── Create property record
├── Set delivery cadence
├── Configure delivery day
├── Assign florist
└── Set up PM account
```

### Stage 3: Resident Communication
```
Inform residents about Bloom
├── PM announces to residents
├── Bloom provides marketing materials
├── Registration link shared
├── FAQ and support info
└── Launch date communicated
```

### Stage 4: Go-Live
```
First delivery and ongoing service
├── Residents subscribe
├── First orders generated
├── First delivery completed
├── Feedback collected
└── Ongoing support
```

---

## Property Information Needed

### Required
```
Property Details
├── Property name
├── Address
├── Unit count
├── Property type (apartment, condo, etc.)
└── Delivery location (lobby, mailroom, etc.)

Property Manager
├── Name
├── Email
├── Phone
└── Role/title

Delivery Configuration
├── Preferred delivery day
├── Delivery cadence (weekly, bi-weekly, monthly)
├── Delivery time window (if any)
└── Access instructions
```

### Optional
```
├── Property logo
├── Resident count
├── Amenities
└── Special requirements
```

---

## Florist Assignment

### Considerations
1. **Geographic proximity**: Minimize delivery distance
2. **Capacity**: Florist can handle order volume
3. **Quality**: Meets Bloom standards
4. **Existing relationships**: May already serve area

### Assignment Process
```
1. Identify property location
2. Find florists in delivery radius
3. Check capacity availability
4. Assess quality fit
5. Assign florist to property
6. Notify florist of new property
```

---

## Resident Communication Templates

### PM Announcement Email
```
Subject: Introducing Bloom - Fresh Flowers Delivered to [Property Name]

Dear Residents,

We're excited to announce a new amenity at [Property Name]!

Bloom is a premium flower subscription service that delivers 
fresh, locally-sourced arrangements right to our building.

HOW IT WORKS
• Sign up at [registration link]
• Choose your delivery frequency
• Fresh flowers delivered to the lobby on [delivery day]

SPECIAL LAUNCH OFFER
[Optional promotional offer]

Questions? Contact [PM name] or visit bloom.app/faq

Best,
[Property Manager Name]
```

### Resident Flyer
```
┌─────────────────────────────────────────┐
│         🌸 BLOOM IS HERE 🌸             │
│                                         │
│   Fresh flowers delivered to           │
│   [Property Name] every [day]          │
│                                         │
│   ✓ Premium arrangements               │
│   ✓ Local florists                     │
│   ✓ Skip or pause anytime              │
│                                         │
│   SIGN UP: bloom.app/[property-code]   │
│                                         │
│   Questions? [PM contact]              │
└─────────────────────────────────────────┘
```

---

## Launch Checklist

### Pre-Launch (T-14 days)
- [ ] Property created in system
- [ ] Delivery schedule configured
- [ ] Florist assigned and notified
- [ ] PM account created
- [ ] Registration link generated
- [ ] Marketing materials prepared

### Launch Week (T-7 days)
- [ ] PM sends announcement
- [ ] Flyers posted (if applicable)
- [ ] Registration link active
- [ ] Support ready for questions

### Go-Live (T-0)
- [ ] First subscribers registered
- [ ] Orders generated
- [ ] Florist confirmed orders
- [ ] Delivery completed
- [ ] Feedback collected

### Post-Launch (T+7 days)
- [ ] Check subscription count
- [ ] Address any issues
- [ ] Follow-up communication
- [ ] PM check-in

---

## Success Metrics

### Activation Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Time to first subscriber | < 7 days | Speed of adoption |
| Launch participation | > 10% | Initial sign-up rate |
| First delivery success | 100% | No issues on day 1 |

### Ongoing Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Participation rate | > 20% | Subscribers / units |
| Retention rate | > 80% | Monthly retention |
| NPS | > 50 | Customer satisfaction |

---

## Common Activation Challenges

### Low Initial Sign-ups
**Causes**: Poor communication, timing, pricing
**Solutions**: 
- Re-send announcement
- PM personal outreach
- Limited-time offer
- Resident event

### PM Disengagement
**Causes**: Busy, unclear value, no incentive
**Solutions**:
- Simplify PM requirements
- Provide ready-to-use materials
- PM rewards program
- Regular check-ins

### Florist Issues
**Causes**: Capacity, quality, communication
**Solutions**:
- Backup florist ready
- Clear expectations
- Quick escalation path
- Quality monitoring

---

## Property Tiers (Future)

### Tier 1: Self-Service
- Small properties (< 50 units)
- PM self-registers
- Automated setup
- Standard support

### Tier 2: Assisted
- Medium properties (50-200 units)
- Bloom assists setup
- Custom launch support
- Dedicated contact

### Tier 3: Enterprise
- Large properties (200+ units)
- Full white-glove service
- Custom branding
- Account manager

---

## Implementation Recommendations for Bloom

### Phase 1: MLP (Manual)
1. Direct PM outreach
2. Manual property setup
3. Email-based communication
4. 1:1 launch support
5. Manual tracking

### Phase 2: Streamlined
1. PM self-registration
2. Automated property setup
3. Template-based communication
4. Launch playbook
5. Dashboard tracking

### Phase 3: Scaled
1. Property acquisition funnel
2. Automated onboarding
3. Self-service launch tools
4. Performance analytics
5. Tiered support model

---

## Data Model

```
Property
├── id
├── name
├── address
├── unit_count
├── delivery_day
├── delivery_cadence
├── florist_id
├── status: pending | active | inactive
├── activated_at
└── pm_user_id

PropertyActivation
├── property_id
├── stage: setup | communication | live
├── checklist: json
├── launch_date
├── notes
└── updated_at

PropertyMetrics
├── property_id
├── date
├── subscriber_count
├── participation_rate
├── delivery_count
└── issues_count
```

---

## Sources

- Property management software patterns
- Marketplace activation playbooks
- B2B onboarding best practices
- Launch checklist frameworks

*Content was rephrased for compliance with licensing restrictions*
