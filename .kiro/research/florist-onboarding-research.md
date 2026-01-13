# Florist Onboarding Best Practices Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on onboarding florists to marketplace/platform businesses, informing Bloom's florist acquisition and activation process.

---

## Bloom's Florist Model

### Key Characteristics
- Florists are fulfillment partners, not marketplace sellers
- Bloom assigns florists to properties (no florist selection by customers)
- Florists use existing Shopify stores for catalog
- Bloom generates orders, florists fulfill

### What Florists Get
- Predictable, recurring orders
- No customer acquisition cost
- Bulk delivery efficiency
- Platform handles billing

### What Bloom Needs
- Quality arrangements
- Reliable fulfillment
- Geographic coverage
- Capacity commitment

---

## Onboarding Stages

### 1. Discovery & Outreach
```
Identify potential florists
├── Geographic coverage needs
├── Quality standards
├── Capacity requirements
└── Shopify store presence
```

### 2. Application & Vetting
```
Florist applies or is invited
├── Business information
├── Shopify store review
├── Portfolio/quality check
├── Capacity assessment
└── References (optional)
```

### 3. Agreement & Setup
```
Terms agreed, account created
├── Service agreement signed
├── Bloom account created
├── Shopify OAuth connection
├── Catalog sync
└── Payment setup
```

### 4. Training & Activation
```
Florist ready to fulfill
├── Portal walkthrough
├── Order workflow training
├── Quality standards review
├── Test order (optional)
└── Property assignment
```

---

## Florist Application Form

### Required Information
```
Business Information
├── Business name
├── Contact name
├── Email
├── Phone
├── Business address
└── Years in business

Shopify Store
├── Store URL
├── Product count
└── Average order volume

Capacity
├── Max orders per day
├── Delivery radius
├── Delivery days available
└── Lead time needed

Quality
├── Portfolio link/photos
├── Specialties
└── Certifications (optional)
```

---

## Vetting Criteria

### Must Have
- [ ] Active Shopify store
- [ ] Quality product photos
- [ ] Reasonable pricing
- [ ] Delivery capability
- [ ] Responsive communication

### Nice to Have
- [ ] Established business (2+ years)
- [ ] Positive reviews
- [ ] Event/subscription experience
- [ ] Sustainable practices
- [ ] Local sourcing

### Red Flags
- [ ] No online presence
- [ ] Poor quality photos
- [ ] Unresponsive to inquiries
- [ ] Unrealistic capacity claims
- [ ] Negative reviews/complaints

---

## Service Agreement Key Terms

### Bloom's Obligations
- Generate and communicate orders
- Handle customer billing
- Provide florist portal
- Pay florists per order

### Florist's Obligations
- Fulfill orders as specified
- Meet quality standards
- Communicate issues promptly
- Maintain Shopify catalog

### Commercial Terms
- Payment per order (net 15/30)
- Minimum quality standards
- Cancellation/termination terms
- Exclusivity (if any)

### Quality Standards
```
Arrangement Quality
├── Fresh flowers (X days from cut)
├── Full, balanced arrangements
├── Proper packaging
├── Consistent with photos

Delivery Standards
├── On-time delivery
├── Proper handling
├── Professional presentation
└── Issue resolution
```

---

## Shopify Connection Flow

### OAuth Process
```
1. Florist clicks "Connect Shopify" in Bloom
2. Redirected to Shopify authorization
3. Florist approves permissions
4. Bloom receives access token
5. Initial catalog sync
6. Connection confirmed
```

### Required Permissions
- Read products
- Read inventory
- (Future: Write orders)

### Post-Connection
- Catalog synced to Bloom
- Products available for orders
- Inventory levels tracked

---

## Training Materials

### Portal Walkthrough
1. Dashboard overview
2. Viewing upcoming orders
3. Confirming orders
4. Marking fulfilled
5. Managing capacity
6. Getting help

### Order Workflow
1. Receive order notification
2. Review order details
3. Prepare arrangements
4. Mark as fulfilled
5. Coordinate delivery

### Quality Guidelines
- Arrangement standards
- Packaging requirements
- Delivery expectations
- Issue escalation

---

## Activation Checklist

### Before First Order
- [ ] Agreement signed
- [ ] Bloom account created
- [ ] Shopify connected
- [ ] Catalog synced
- [ ] Capacity configured
- [ ] Portal training completed
- [ ] Payment info verified
- [ ] Property assigned

### First Order Success
- [ ] Order received and confirmed
- [ ] Arrangement prepared
- [ ] Delivery completed
- [ ] Feedback collected
- [ ] Issues resolved (if any)

---

## Ongoing Support

### Communication Channels
- Email for non-urgent
- Phone for urgent issues
- Portal for order management
- Slack/chat for partners (future)

### Regular Check-ins
- Weekly during first month
- Monthly after stabilization
- Quarterly business reviews

### Performance Monitoring
- Order fulfillment rate
- On-time delivery rate
- Quality complaints
- Customer feedback

---

## Scaling Florist Network

### Geographic Expansion
1. Identify coverage gaps
2. Research local florists
3. Outreach campaign
4. Vet and onboard
5. Assign to properties

### Capacity Management
- Monitor utilization
- Proactive recruitment
- Backup florist relationships
- Seasonal planning

---

## Implementation Recommendations for Bloom

### Phase 1: MLP (Manual)
1. Direct outreach to florists
2. Manual vetting process
3. Simple agreement (email/PDF)
4. Guided Shopify connection
5. 1:1 training calls

### Phase 2: Self-Service
1. Florist application form
2. Automated Shopify connection
3. Self-service portal training
4. Automated onboarding emails

### Phase 3: Scaled
1. Florist marketplace/directory
2. Automated vetting tools
3. Performance scoring
4. Tiered partnership levels

---

## Data Model

```
Florist
├── id
├── business_name
├── contact_name
├── email
├── phone
├── address
├── shopify_store_url
├── shopify_access_token
├── status: pending | active | suspended
├── max_daily_orders
├── onboarded_at
└── agreement_signed_at

FloristOnboarding
├── florist_id
├── step: application | vetting | agreement | setup | training | active
├── completed_steps: json
├── notes
└── updated_at
```

---

## Sources

- Marketplace onboarding best practices
- Florist software patterns
- Partner management frameworks
- B2B onboarding research

*Content was rephrased for compliance with licensing restrictions*
