# Email/Notification Services Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on transactional email and notification patterns using AWS SES for the Bloom platform.

---

## AWS SES Overview

Amazon Simple Email Service (SES) is a cost-effective email service for:
- Transactional emails (order confirmations, notifications)
- Marketing emails (newsletters, promotions)
- High deliverability with AWS infrastructure

### Pricing
- $0.10 per 1,000 emails sent
- Free tier: 62,000 emails/month from EC2
- No monthly fees

---

## Email Types for Bloom

### Transactional Emails (No Opt-In Required)
| Email Type | Trigger | Priority |
|------------|---------|----------|
| Welcome Email | User registration | ✅ MLP |
| Subscription Confirmed | Subscription activated | ✅ MLP |
| Delivery Reminder | X days before delivery | ✅ MLP |
| Delivery Skipped | User skips delivery | ✅ MLP |
| Subscription Paused | User pauses | ✅ MLP |
| Subscription Resumed | User resumes | ✅ MLP |
| Payment Failed | Dunning notification | ✅ MLP |
| Password Reset | Security | ✅ MLP |

### Marketing Emails (Opt-In Required)
| Email Type | Trigger | Priority |
|------------|---------|----------|
| Newsletter | Monthly | ⚠️ Future |
| Promotions | Campaigns | ⚠️ Future |
| Re-engagement | Inactive users | ⚠️ Future |

---

## AWS SES Setup

### 1. Domain Verification
- Verify sending domain (e.g., bloom.app)
- Configure DKIM, SPF, DMARC
- Move out of sandbox for production

### 2. Email Templates
- Use SES templates for consistent branding
- Support dynamic variables (name, dates, etc.)
- HTML + plain text versions

### 3. Sending Configuration
```
Configuration Set
├── Tracking (opens, clicks)
├── Reputation dashboard
└── Event destinations (SNS, CloudWatch)
```

---

## Email Template Examples

### Delivery Reminder
```
Subject: Your flowers arrive tomorrow! 🌸

Hi {{first_name}},

Your next Bloom delivery is scheduled for {{delivery_date}}.

Property: {{property_name}}
Arrangement: {{arrangement_name}}

Need to skip this delivery? You have until {{skip_cutoff}} to 
make changes in your dashboard.

[View My Dashboard]

Happy blooming!
The Bloom Team
```

### Subscription Confirmed
```
Subject: Welcome to Bloom! Your subscription is active 🌷

Hi {{first_name}},

Great news! Your Bloom subscription is now active.

Property: {{property_name}}
Delivery Schedule: {{cadence}} on {{delivery_day}}s
First Delivery: {{first_delivery_date}}

What to expect:
• Fresh flowers delivered to your building
• Easy skip or pause anytime
• Premium arrangements from local florists

[Explore Your Dashboard]

Welcome to the Bloom family!
The Bloom Team
```

---

## Notification Timing

### Delivery Reminder Schedule
```
Delivery Date: Friday, Jan 3
├── T-3 days (Tuesday): "Your delivery is coming Friday"
├── T-1 day (Thursday): "Flowers arriving tomorrow!"
└── T+0 (Friday): "Your flowers have been delivered" (future)
```

### Skip Cutoff Reminder
```
Skip Cutoff: Wednesday, Jan 1 (48 hours before)
├── T-2 days (Monday): "Last chance to skip Friday's delivery"
```

---

## Implementation Architecture

### Option 1: Direct SES (Simple)
```
App → SES API → Email Sent
```
- Synchronous sending
- Good for low volume
- Simple implementation

### Option 2: SQS + Lambda (Scalable)
```
App → SQS Queue → Lambda → SES → Email Sent
```
- Asynchronous sending
- Handles spikes
- Retry on failure

### Recommended for Bloom MLP: Direct SES
- Lower complexity
- Sufficient for initial scale
- Can migrate to queue later

---

## Email Deliverability Best Practices

### Authentication
1. **SPF**: Authorize SES to send for your domain
2. **DKIM**: Sign emails cryptographically
3. **DMARC**: Policy for handling failures

### Content Best Practices
- Clear sender name ("Bloom" not "noreply")
- Recognizable from address (hello@bloom.app)
- Unsubscribe link (for marketing emails)
- Mobile-responsive templates
- Plain text alternative

### Reputation Management
- Monitor bounce rates (< 5%)
- Monitor complaint rates (< 0.1%)
- Use dedicated IP for high volume (future)
- Warm up new sending domains

---

## SMS Notifications (Future)

### Use Cases
- Delivery day reminder
- Urgent notifications
- Two-factor authentication

### AWS SNS for SMS
- Pay per message
- US: ~$0.00645 per SMS
- Requires phone number collection

### Recommendation: Email-first for MLP
- Lower cost
- No phone number required
- SMS as Phase 2 enhancement

---

## Notification Preferences

### User Settings
```
NotificationPreferences
├── email_delivery_reminders: boolean (default: true)
├── email_subscription_updates: boolean (default: true)
├── email_marketing: boolean (default: false)
└── sms_enabled: boolean (default: false)
```

### Preference UI
```
┌─────────────────────────────────────────┐
│  Notification Preferences               │
│  ─────────────────────────────────────  │
│  ☑ Delivery reminders                   │
│  ☑ Subscription updates                 │
│  ☐ Marketing and promotions             │
└─────────────────────────────────────────┘
```

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. AWS SES setup with domain verification
2. Basic templates (welcome, delivery reminder, pause/resume)
3. Direct SES sending from API
4. Simple notification preferences

### Phase 2: Enhanced
1. Rich HTML templates with branding
2. Open/click tracking
3. Delivery confirmation emails
4. Skip confirmation emails

### Phase 3: Advanced
1. SMS notifications
2. Push notifications (mobile app)
3. Marketing email campaigns
4. A/B testing for templates

---

## API/Service Design

### Email Service Interface
```python
class EmailService:
    def send_welcome_email(user: User) -> bool
    def send_delivery_reminder(user: User, delivery: Delivery) -> bool
    def send_subscription_paused(user: User) -> bool
    def send_subscription_resumed(user: User) -> bool
    def send_payment_failed(user: User) -> bool
```

### Scheduled Jobs
```
Daily Jobs:
├── 9:00 AM: Send T-3 delivery reminders
├── 9:00 AM: Send T-1 delivery reminders
└── 9:00 AM: Send skip cutoff reminders
```

---

## Sources

- [AWS SES Documentation](https://aws.amazon.com/ses/)
- [AWS SES Delivery Notifications](https://aws.amazon.com/blogs/aws/ses-delivery-notifications/)
- [Semplates - Transactional Emails with AWS SES](https://semplates.io/blog/how-to-send-36-000-transactional-emails-for-free-using-amazon-ses-2024/)
- [AWS SES Best Practices](https://blog.campaignhq.co/aws-ses-dos-and-donts/)

*Content was rephrased for compliance with licensing restrictions*
