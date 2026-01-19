# Bloom High Level Design

## System Overview

Bloom is a cloud-native, polyglot persistence platform built on AWS that orchestrates floral subscription deliveries across properties, florists, and customers. The system integrates with Shopify (product catalog), Stripe (payments), and AWS Cognito (authentication) to provide a complete subscription management solution.

**Architecture Philosophy:**
- **Polyglot Persistence:** Use the right database for each use case (Neo4j for relationships, RDS for transactions)
- **Event-Driven:** Webhooks and domain events drive system behavior
- **API-First:** RESTful APIs with clear contracts and versioning
- **Secure by Default:** Cognito authentication, Secrets Manager for credentials, encrypted data at rest
- **Cost-Optimized:** Serverless where possible, auto-scaling for variable load

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                            │
├──────────────────────────────────────────────────────────────────────────┤
│  AWS Cognito       │  Shopify API      │  Stripe API    │  AWS SES       │
│  (Auth)            │  (Products)       │  (Payments)    │  (Email)       │
└──────────────┬─────────────┬───────────────┬────────────────┬────────────┘
               │             │               │                │
               │             │               │                │
┌──────────────▼─────────────▼───────────────▼────────────────▼────────────┐
│                           API GATEWAY / LOAD BALANCER                     │
│                         (AWS Application Load Balancer)                   │
└──────────────┬────────────────────────────────────────────────────────────┘
               │
               │
┌──────────────▼────────────────────────────────────────────────────────────┐
│                         BACKEND APPLICATION LAYER                          │
│                          (AWS App Runner - FastAPI)                        │
│                                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Customer   │  │    Admin     │  │   Florist    │  │      PM      │ │
│  │     API      │  │     API      │  │     API      │  │     API      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │                 │          │
│  ┌──────▼─────────────────▼─────────────────▼─────────────────▼───────┐  │
│  │                      Service Layer                                  │  │
│  │  - PropertyService  - FloristService  - DeliveryService            │  │
│  │  - UserService      - PayoutService   - PaymentService             │  │
│  └──────┬─────────────────────────────────────────────────┬───────────┘  │
│         │                                                 │               │
│  ┌──────▼──────────┐                              ┌───────▼────────────┐ │
│  │  Neo4j Client   │                              │   RDS Client       │ │
│  │  (Graph Queries)│                              │   (SQL Queries)    │ │
│  └──────┬──────────┘                              └───────┬────────────┘ │
└─────────┼─────────────────────────────────────────────────┼──────────────┘
          │                                                 │
          │                                                 │
┌─────────▼────────────┐                         ┌──────────▼──────────────┐
│   Neo4j Aura         │                         │   Amazon RDS            │
│   (Graph Database)   │                         │   (PostgreSQL)          │
│                      │                         │                         │
│  • Users             │                         │  • Deliveries           │
│  • Properties        │                         │  • DeliveryLineItems    │
│  • Florists          │                         │  • FloristPayouts       │
│  • Products          │                         │  • CustomerBilling      │
│  • Relationships     │                         │  • PaymentTransactions  │
└──────────────────────┘                         │  • WebhookEvents        │
                                                  │  • AuditLogs            │
                                                  └─────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND APPLICATION LAYER                         │
│                            (AWS Amplify - React)                           │
│                                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │  Customer  │  │   Admin    │  │  Florist   │  │     PM     │         │
│  │ Dashboard  │  │ Dashboard  │  │ Dashboard  │  │ Dashboard  │         │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘         │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                    Shared Components                              │    │
│  │  - AuthProvider  - API Client  - Routing  - State Management     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         SUPPORTING AWS SERVICES                            │
├──────────────────────────────────────────────────────────────────────────┤
│  • Secrets Manager (Shopify tokens, Stripe keys)                         │
│  • S3 (Delivery photos, static assets)                                   │
│  • CloudWatch (Logs, metrics, alarms)                                    │
│  • EventBridge (Scheduled jobs - delivery generation, payouts)           │
│  • Lambda (Async processing - webhooks, background jobs)                 │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Frontend Layer (React + AWS Amplify)

**Technology Stack:**
- React 19
- TypeScript 5.9
- Vite 7 (build tool)
- Tailwind CSS 4 (styling)
- React Router 7 (routing)

**Deployment:**
- **AWS Amplify Hosting** - Serverless, auto-scaling static site hosting
- **CI/CD:** Auto-deploy on git push to `main` branch
- **CDN:** CloudFront distribution for global edge caching
- **Domain:** Custom domain with SSL/TLS certificate

**Key Features:**
- Role-based dashboards (Customer, Admin, Florist, PM)
- Cognito SDK integration for authentication
- Protected routes with role guards
- Responsive design (mobile-first)
- Real-time updates (polling or WebSocket future)

**Component Structure:**
```
/src
  /pages            # Route components (per role)
  /components       # Reusable UI components
  /providers        # Context providers (Auth, Theme)
  /lib              # API client, utilities
  /router           # Route configuration + guards
  /hooks            # Custom React hooks
```

---

### 2. Backend Layer (FastAPI + AWS App Runner)

**Technology Stack:**
- Python 3.11+
- FastAPI 0.109+ (async web framework)
- Pydantic (validation & serialization)
- Neo4j Python Driver (graph database client)
- SQLAlchemy 2.0+ (RDS ORM)
- Alembic (database migrations)

**Deployment:**
- **AWS App Runner** - Fully managed container service
- **Container Registry:** Amazon ECR
- **Auto-Scaling:** Based on CPU/memory/request count
- **Health Checks:** `/health` endpoint for liveness probe

**API Design:**
- **RESTful** endpoints with clear HTTP semantics
- **Role-based access control** via Cognito token validation
- **Standardized error responses** (error envelope pattern)
- **Request ID correlation** for debugging
- **OpenAPI/Swagger docs** at `/docs`

**Router Organization:**
```
/routes
  /auth.py           # Authentication (Cognito)
  /customer          # Customer APIs (/me/*)
  /admin             # Admin APIs (/admin/*)
  /florist           # Florist APIs (/florist/*)
  /pm                # PM APIs (/pm/*)
  /webhooks          # External webhooks (Shopify, Stripe, Cognito)
  /internal          # System/admin tools
  /public            # Unauthenticated endpoints
```

**Service Layer Pattern:**
```
Routes → Services → Database Clients
  ↓          ↓            ↓
HTTP     Business      Neo4j / RDS
         Logic         Queries
```

---

### 3. Data Layer

#### **3.1 Neo4j Aura (Graph Database)**

**Purpose:** Store entities with complex relationships

**Data Stored:**
- Users (with Cognito mapping)
- Properties
- Florists
- Products (synced from Shopify)
- All relationships (RESIDES_AT, MANAGES, ASSIGNED_TO, OFFERS, MAPS_TO_TIER)

**Why Graph Database:**
- ✅ No N+1 query problems (single graph traversal)
- ✅ Natural property status computation (relationship patterns)
- ✅ Enriched queries without joins (e.g., property with florist name, PM email, resident count)
- ✅ Flexible schema evolution (add relationships without migrations)

**Deployment:**
- **Neo4j Aura Free Tier** (development)
- **Neo4j Aura Professional** (production)
- **Backups:** Automated daily snapshots
- **Connection:** TLS-encrypted (neo4j+s://)

**Query Pattern Example:**
```cypher
// Get enriched properties (single query, no N+1)
MATCH (p:Property)
OPTIONAL MATCH (p)-[:ASSIGNED_TO {active: true}]->(f:Florist)
OPTIONAL MATCH (p)-[:MANAGED_BY]->(pm:User)
OPTIONAL MATCH (p)<-[:RESIDES_AT]-(r:User {status: 'ACTIVE'})
RETURN p, f.name, pm.email, count(r) as residents
```

---

#### **3.2 Amazon RDS (PostgreSQL)**

**Purpose:** Store transactional, time-series, and financial data

**Data Stored:**
- Deliveries (ACID transactions critical)
- DeliveryLineItems (immutable financial records)
- FloristPayouts (batch payment tracking)
- CustomerBilling (Stripe subscription mapping)
- PaymentTransactions (payment history)
- WebhookEvents (audit log)
- AuditLogs (admin action tracking)

**Why Relational Database:**
- ✅ ACID transactions for financial data
- ✅ Mature tooling for time-series queries (delivery history)
- ✅ Strong consistency for billing
- ✅ Complex aggregations (payout calculations, revenue reports)

**Deployment:**
- **Instance Type:** db.t3.micro (dev), db.t3.small+ (prod)
- **Multi-AZ:** Yes (production) for high availability
- **Backups:** Automated daily backups, 7-day retention
- **Encryption:** At-rest (KMS) and in-transit (SSL/TLS)
- **Connection Pooling:** SQLAlchemy pool (size=5, max_overflow=10)

**Migration Strategy:**
- **Alembic** for version-controlled schema changes
- **Auto-run on startup** in development mode
- **Manual review required** for production migrations

---

### 4. Authentication & Authorization (AWS Cognito)

**Cognito User Pool Configuration:**
```
User Attributes:
  - email (required, unique)
  - custom:bloom_role (CUSTOMER | PROPERTY_MANAGER | FLORIST | ADMIN)
  - custom:property_id (optional, for customers)
  - custom:subscription_status (optional, for customers)
  - custom:subscription_plan (optional, for customers)

Password Policy:
  - Min length: 12 characters
  - Require: uppercase, lowercase, numbers, symbols
  - No common passwords

MFA:
  - Optional for customers
  - Required for admins

Email Verification:
  - Required for all users
```

**Token Flow:**
```
1. User submits credentials
   ↓
2. Cognito validates & returns tokens
   - ID Token (user identity + custom attributes)
   - Access Token (API authorization)
   - Refresh Token (long-lived)
   ↓
3. Frontend stores tokens in localStorage
   ↓
4. API requests include ID token in Authorization header
   ↓
5. Backend validates token signature (JWKS verification)
   ↓
6. Extract user info (sub, email, role) from token claims
   ↓
7. Query Neo4j for full user details
```

**Role-Based Access Control:**
```python
# Route protection decorator
@router.get("/admin/properties")
async def get_properties(
    current_user: dict = Depends(require_role(["ADMIN"]))
):
    # Only admins can access
    pass
```

**Security Features:**
- Token expiration: 1 hour (ID/access), 30 days (refresh)
- JWKS key rotation: Automatic
- Account lockout: 5 failed attempts
- Email verification: Required before activation

---

### 5. External Integrations

#### **5.1 Shopify Integration**

**Purpose:** Product catalog sync, inventory management, optional order creation

**Authentication:** OAuth 2.0
- Florist authorizes Bloom app in Shopify admin
- Access token stored in AWS Secrets Manager
- Token never stored in database

**API Operations:**
```
Read Operations:
  - GET /admin/api/2024-01/products.json (product sync)
  - GET /admin/api/2024-01/inventory_levels.json (inventory check)

Write Operations:
  - POST /admin/api/2024-01/draft_orders.json (optional order creation)
  - POST /admin/api/2024-01/inventory_levels/set.json (inventory decrement)

Webhook Subscriptions:
  - orders/fulfilled (delivery completion notification)
  - products/update (price/inventory change)
  - products/delete (handle discontinued products)
```

**Data Flow:**
```
Florist connects Shopify
  ↓
Bloom requests products via REST API
  ↓
Products stored in Neo4j (Product nodes)
  ↓
Florist maps products to subscription tiers (MAPS_TO_TIER relationship)
  ↓
Delivery created → Use mapped product
  ↓
Delivery completed → Decrement inventory via API
  ↓
Optional: Create Shopify draft order for florist's records
```

**Rate Limiting:**
- Shopify limit: 2 requests/second
- Bloom strategy: Batch requests, exponential backoff on 429 errors

---

#### **5.2 Stripe Integration**

**Purpose:** Customer billing, florist payouts (Stripe Connect)

**Stripe Products:**
- **Stripe Billing:** Recurring customer subscriptions
- **Stripe Connect:** Florist payouts (Express accounts)

**Customer Payment Flow:**
```
Customer activates subscription
  ↓
Create Stripe Customer (stripe.Customer.create)
  ↓
Create Stripe Subscription (stripe.Subscription.create)
  - Price: Based on subscription plan (ESSENTIAL/SIGNATURE/STATEMENT)
  - Interval: Based on property delivery cadence (weekly/monthly)
  ↓
Stripe charges customer automatically per billing cycle
  ↓
Webhook: payment_intent.succeeded → Create PaymentTransaction record
  ↓
Webhook: payment_intent.failed → Notify customer, trigger retry
```

**Florist Payout Flow:**
```
Deliveries completed during week
  ↓
Monday: Payout job runs (AWS EventBridge trigger)
  ↓
Calculate florist earnings (sum of florist_payout from DeliveryLineItems)
  ↓
Create FloristPayout record (status = pending)
  ↓
Admin reviews & approves payout
  ↓
Create Stripe Connect Transfer (stripe.Transfer.create)
  - Amount: net_amount (after Bloom commission)
  - Destination: florist's Stripe Connect account
  ↓
Webhook: transfer.paid → Update FloristPayout (status = paid)
```

**Security:**
- Stripe API keys stored in Secrets Manager
- Webhook signature verification (HMAC-SHA256)
- PCI compliance: Stripe handles card data (never touches Bloom servers)

---

#### **5.3 AWS SES (Email Service)**

**Purpose:** Transactional emails

**Email Types:**
```
Customer Emails:
  - Welcome email (after registration)
  - Subscription confirmation
  - Delivery reminder (24h before)
  - Delivery confirmation (with photo)
  - Payment receipt
  - Payment failure notification

Florist Emails:
  - Onboarding instructions
  - Weekly delivery schedule
  - Payout summary
  - Payment confirmation

Admin Emails:
  - Payout approval request
  - System error alerts
  - Daily summary report
```

**Configuration:**
- **From Address:** noreply@bloom.com (verified domain)
- **Templates:** HTML + plain text versions
- **Tracking:** Open rates, click rates (SES analytics)
- **Bounce Handling:** Automatic suppression list management

---

### 6. Background Jobs & Scheduled Tasks

**AWS EventBridge Rules:**

```
1. Daily Delivery Generation
   Schedule: Every day at 12:00 AM UTC
   Target: Lambda function
   Action: Generate deliveries for next 7 days based on property cadence

2. Weekly Payout Calculation
   Schedule: Every Monday at 9:00 AM UTC
   Target: Lambda function
   Action: Calculate payouts for previous week (Monday-Sunday)

3. Product Sync
   Schedule: Every day at 3:00 AM UTC
   Target: Lambda function
   Action: Sync products from Shopify for all florists

4. Inventory Alerts
   Schedule: Every 6 hours
   Target: Lambda function
   Action: Check for low stock, notify florists

5. Billing Reminder
   Schedule: Every day at 8:00 AM local time
   Target: Lambda function
   Action: Remind customers of upcoming charges (3 days before)
```

**Lambda Function Architecture:**
```python
# Lambda handler
def handler(event, context):
    # Initialize database connections
    neo4j_session = get_neo4j_session()
    db_session = get_rds_session()

    # Perform background job
    result = generate_weekly_deliveries(neo4j_session, db_session)

    # Log results
    logger.info(f"Generated {result['count']} deliveries")

    # Close connections
    neo4j_session.close()
    db_session.close()

    return {"statusCode": 200, "body": json.dumps(result)}
```

---

### 7. Data Storage & File Management

#### **Amazon S3 (Object Storage)**

**Buckets:**
```
bloom-delivery-photos-prod
  - Delivery proof photos (uploaded by florists)
  - Lifecycle: Transition to Glacier after 90 days
  - Public read access: No (presigned URLs only)

bloom-static-assets-prod
  - Frontend static assets (served by CloudFront)
  - Public read access: Yes

bloom-reports-prod
  - Generated reports (CSV exports, analytics)
  - Lifecycle: Delete after 30 days
```

**File Upload Flow:**
```
Florist marks delivery complete
  ↓
Frontend requests presigned S3 URL from API
  ↓
API generates presigned POST URL (boto3.generate_presigned_post)
  ↓
Frontend uploads photo directly to S3
  ↓
Frontend sends S3 object key to API
  ↓
API updates Delivery.delivery_photo_url
```

---

### 8. Observability & Monitoring

#### **AWS CloudWatch**

**Logs:**
- **Application Logs:** App Runner → CloudWatch Logs
  - Log groups: `/aws/apprunner/bloom-api`
  - Retention: 30 days (development), 90 days (production)
  - Structured logging (JSON format)

**Metrics:**
```
Application Metrics:
  - Request count per endpoint
  - Response time (p50, p95, p99)
  - Error rate (4xx, 5xx)
  - Database query latency

Business Metrics:
  - Active subscriptions
  - Deliveries completed today
  - Revenue (daily, weekly, monthly)
  - Florist payout pending amount
```

**Alarms:**
```
Critical Alarms:
  - API error rate > 5% for 5 minutes
  - RDS CPU > 80% for 10 minutes
  - Neo4j connection failures
  - Stripe webhook failures

Warning Alarms:
  - API response time p95 > 2 seconds
  - Delivery photo upload failures
  - Email delivery failures
```

**Dashboards:**
- **Operational Dashboard:** API health, database metrics, error rates
- **Business Dashboard:** Subscriptions, deliveries, revenue, payouts

---

#### **Error Tracking (Sentry)**

**Integration:**
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("ENVIRONMENT"),
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1  # 10% of transactions for performance monitoring
)
```

**Captured Events:**
- Unhandled exceptions
- Failed database queries
- External API errors (Shopify, Stripe)
- Webhook processing failures

---

### 9. Security Architecture

#### **Defense in Depth**

**Layer 1: Network Security**
- **VPC:** Backend in private subnets (no direct internet access)
- **Security Groups:** Restrict inbound/outbound traffic
- **WAF:** AWS WAF on ALB (protect against SQL injection, XSS)

**Layer 2: Authentication & Authorization**
- **Cognito:** Centralized user authentication
- **JWT Validation:** Every API request validates token
- **Role-Based Access:** Route-level permissions

**Layer 3: Data Security**
- **Encryption at Rest:**
  - RDS: AWS KMS encryption
  - S3: Server-side encryption (SSE-S3)
  - Neo4j Aura: Built-in encryption
- **Encryption in Transit:**
  - HTTPS/TLS 1.3 for all API traffic
  - Database connections over TLS

**Layer 4: Secrets Management**
- **AWS Secrets Manager:**
  - Shopify access tokens
  - Stripe API keys
  - Database credentials
  - JWT signing keys
- **Automatic Rotation:** Enable for database passwords

**Layer 5: Application Security**
- **Input Validation:** Pydantic schemas for all requests
- **SQL Injection Prevention:** Parameterized queries (SQLAlchemy)
- **CSRF Protection:** SameSite cookies, CSRF tokens
- **Rate Limiting:** Per-user, per-IP limits (future)

**Layer 6: Audit & Compliance**
- **Audit Logs:** All admin actions logged to RDS
- **CloudTrail:** AWS API calls logged
- **GDPR Compliance:** User data deletion, data export APIs

---

### 10. Disaster Recovery & Business Continuity

**Backup Strategy:**

```
Neo4j Aura:
  - Automated daily snapshots (retained 7 days)
  - Point-in-time recovery: Yes
  - Recovery Time Objective (RTO): 1 hour
  - Recovery Point Objective (RPO): 24 hours

Amazon RDS:
  - Automated daily backups (retained 7 days)
  - Transaction log backups: Every 5 minutes
  - Point-in-time recovery: Yes (within backup window)
  - RTO: 1 hour
  - RPO: 5 minutes

S3 (Delivery Photos):
  - Versioning: Enabled
  - Cross-region replication: Optional (production)
  - RTO: Immediate (read from replica)
  - RPO: Near-zero
```

**Disaster Recovery Plan:**

```
Scenario 1: App Runner Failure
  - App Runner auto-restarts containers
  - If persistent: Deploy to new App Runner service
  - DNS cutover: Route53 health checks
  - RTO: 15 minutes

Scenario 2: RDS Failure (Multi-AZ)
  - Automatic failover to standby instance
  - RTO: 1-2 minutes
  - RPO: 0 (synchronous replication)

Scenario 3: Neo4j Aura Failure
  - Restore from latest snapshot
  - RTO: 1 hour
  - RPO: 24 hours (accept data loss for non-critical relationship data)

Scenario 4: Region Outage (AWS us-east-1)
  - Manual failover to backup region (us-west-2)
  - Restore databases from cross-region backups
  - Update DNS to point to new region
  - RTO: 4 hours
  - RPO: 24 hours
```

---

## Data Flow Diagrams

### Customer Subscription Flow

```
┌─────────┐
│ Customer│
│ Browses │
│  Bloom  │
└────┬────┘
     │
     ▼
┌─────────────────┐
│ Select Property │
└────┬────────────┘
     │
     ▼
┌──────────────────────┐
│ Choose Plan & Cadence│
└────┬─────────────────┘
     │
     ▼
┌────────────────────┐       ┌──────────┐
│ Enter Payment Info │──────▶│  Stripe  │
└────┬───────────────┘       │  Billing │
     │                       └──────────┘
     ▼
┌─────────────────────┐
│ Activate Subscription│
└────┬────────────────┘
     │
     ├──────────────────────┬──────────────────────┬───────────────────┐
     ▼                      ▼                      ▼                   ▼
┌─────────┐         ┌──────────────┐       ┌──────────────┐   ┌───────────┐
│  Neo4j  │         │ Stripe Create│       │ RDS Create   │   │ Send Email│
│ Create  │         │ Subscription │       │ Billing      │   │Confirmation│
│ User    │         └──────────────┘       │ Record       │   └───────────┘
│ RESIDES_│                                └──────────────┘
│ AT      │
│Property │
└─────────┘
     │
     ▼
┌──────────────────────┐
│Generate Initial      │
│Delivery Schedule     │
│(EventBridge Lambda)  │
└──────────────────────┘
```

---

### Delivery Fulfillment Flow

```
┌───────────────┐
│Delivery       │
│Scheduled      │
│(status:       │
│ SCHEDULED)    │
└───┬───────────┘
    │
    ▼
┌───────────────────┐
│24h Before:        │
│Send Reminder Email│
│to Customer        │
└───┬───────────────┘
    │
    ▼
┌───────────────────┐
│Florist Sees       │
│Delivery in        │
│Dashboard          │
└───┬───────────────┘
    │
    ├─────────────────────┬─────────────────┐
    ▼                     ▼                 ▼
┌──────────┐      ┌──────────────┐   ┌──────────┐
│Delivered │      │ Missed       │   │ Skipped  │
└───┬──────┘      └───┬──────────┘   └───┬──────┘
    │                 │                  │
    ▼                 ▼                  ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│Upload Photo │  │Add Notes     │  │Update Status│
└───┬─────────┘  │(why missed)  │  │in RDS       │
    │            └───┬──────────┘  └─────────────┘
    ▼                │
┌─────────────────┐  │
│Mark Delivered   │  │
│in Dashboard     │  │
└───┬─────────────┘  │
    │                │
    ▼                ▼
┌──────────────────────────┐
│Update Delivery Status    │
│in RDS                    │
└───┬──────────────────────┘
    │
    ├───────────────────┬────────────────┬──────────────┐
    ▼                   ▼                ▼              ▼
┌─────────┐      ┌──────────────┐  ┌─────────┐  ┌─────────┐
│Create   │      │Decrement     │  │Send     │  │Add to   │
│Delivery │      │Shopify       │  │Email to │  │Florist  │
│LineItem │      │Inventory     │  │Customer │  │Pending  │
│(RDS)    │      │(API call)    │  │         │  │Earnings │
└─────────┘      └──────────────┘  └─────────┘  └─────────┘
```

---

### Florist Payout Flow

```
┌────────────────┐
│Every Monday    │
│9:00 AM UTC     │
│(EventBridge)   │
└───┬────────────┘
    │
    ▼
┌─────────────────────────┐
│Lambda: Calculate Payouts│
└───┬─────────────────────┘
    │
    ▼
┌────────────────────────────┐
│Query RDS for all DELIVERED │
│deliveries (Mon-Sun)        │
│Group by florist_id         │
└───┬────────────────────────┘
    │
    ▼
┌──────────────────────────────┐
│For each florist:             │
│ - Sum DeliveryLineItem       │
│   florist_payout             │
│ - Calculate commission       │
│ - Create FloristPayout       │
│   (status = pending)         │
└───┬──────────────────────────┘
    │
    ▼
┌─────────────────────┐
│Send Email to        │
│Florist: Payout      │
│Summary              │
└─────────────────────┘
    │
    ▼
┌─────────────────────┐
│Send Email to Admin: │
│Review & Approve     │
│Payout               │
└───┬─────────────────┘
    │
    ▼
┌───────────────┐
│Admin Reviews  │
│in Dashboard   │
└───┬───────────┘
    │
    ├────────────────┬──────────────┐
    ▼                ▼              │
┌─────────┐     ┌─────────┐        │
│Approve  │     │ Reject  │        │
└───┬─────┘     └───┬─────┘        │
    │               │              │
    ▼               ▼              │
┌──────────────────────┐           │
│Update Status:        │           │
│ - Approve:processing│           │
│ - Reject: rejected   │           │
└───┬──────────────────┘           │
    │                              │
    ▼                              │
┌─────────────────────────┐        │
│Create Stripe Connect    │        │
│Transfer                 │        │
│(stripe.Transfer.create) │        │
└───┬─────────────────────┘        │
    │                              │
    ├──────────────┬───────────────┤
    ▼              ▼               ▼
┌─────────┐  ┌─────────┐    ┌──────────┐
│Success  │  │ Failed  │    │Rejected  │
└───┬─────┘  └───┬─────┘    │Send Email│
    │            │          │to Florist│
    ▼            ▼          └──────────┘
┌─────────────────────┐
│Update Payout Status:│
│ - Success: paid     │
│ - Failed: failed    │
│Set paid_at timestamp│
└───┬─────────────────┘
    │
    ▼
┌────────────────────┐
│Send Confirmation   │
│Email to Florist    │
└────────────────────┘
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript | UI framework |
| | Vite 7 | Build tool |
| | Tailwind CSS 4 | Styling |
| | React Router 7 | Routing |
| **Backend** | FastAPI | REST API framework |
| | Python 3.11+ | Programming language |
| | Pydantic | Validation & serialization |
| | SQLAlchemy 2.0 | RDS ORM |
| | Neo4j Python Driver | Graph database client |
| **Databases** | Neo4j Aura | Graph database (relationships) |
| | Amazon RDS PostgreSQL | Relational database (transactions) |
| **Authentication** | AWS Cognito | User authentication & management |
| **Payments** | Stripe Billing | Customer subscriptions |
| | Stripe Connect | Florist payouts |
| **Email** | AWS SES | Transactional emails |
| **Storage** | Amazon S3 | Object storage (photos, files) |
| **Hosting** | AWS Amplify | Frontend hosting (CDN) |
| | AWS App Runner | Backend container hosting |
| **Monitoring** | AWS CloudWatch | Logs, metrics, alarms |
| | Sentry | Error tracking |
| **Jobs** | AWS EventBridge | Scheduled tasks |
| | AWS Lambda | Serverless functions |
| **Secrets** | AWS Secrets Manager | API keys, credentials |
| **External** | Shopify API | Product catalog |

---

## Scalability Considerations

### Horizontal Scaling

**App Runner:**
- Auto-scales based on CPU, memory, request count
- Min instances: 1 (dev), 2 (prod)
- Max instances: 10 (dev), 25 (prod)
- Scale-up threshold: CPU > 70%
- Scale-down threshold: CPU < 30% for 5 minutes

**RDS:**
- Vertical scaling: Upgrade instance size (db.t3.small → db.t3.medium)
- Read replicas: Add for read-heavy workloads (future)
- Connection pooling: SQLAlchemy manages pool

**Neo4j Aura:**
- Vertical scaling: Upgrade tier (Free → Professional → Enterprise)
- Clustering: Available in Enterprise tier (future)

---

### Caching Strategy (Future)

**Redis/ElastiCache:**
```
Cache Keys:
  - property:{id}:enriched (TTL: 5 minutes)
  - florist:{id}:products (TTL: 1 hour)
  - user:{id}:profile (TTL: 15 minutes)

Invalidation:
  - On update: Delete cache key
  - On relationship change: Delete related keys
```

---

### Database Optimization

**Neo4j:**
- Indexes on frequently queried properties (email, status, role)
- Constraints for uniqueness (email, cognito_sub)
- Query profiling (PROFILE cypher queries)

**RDS:**
- Indexes on foreign keys (user_id, property_id, florist_id)
- Composite indexes for common queries (status + scheduled_for)
- Slow query log analysis (CloudWatch Insights)

---

## Cost Estimation (Production)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| **App Runner** | 2 instances, 1 vCPU, 2GB RAM | ~$50 |
| **RDS** | db.t3.small, 20GB storage, Multi-AZ | ~$70 |
| **Neo4j Aura** | Professional tier | $65 |
| **Cognito** | 1,000 MAUs | ~$5 |
| **Amplify** | Frontend hosting, 100GB/month | ~$15 |
| **S3** | 100GB storage, 10k requests/month | ~$3 |
| **SES** | 10,000 emails/month | ~$1 |
| **CloudWatch** | Logs + metrics | ~$10 |
| **Secrets Manager** | 10 secrets | ~$4 |
| **Stripe** | 2.9% + $0.30 per transaction | Variable |
| **Total (Fixed)** | | **~$223/month** |

---

## References

- [Domain Model](./domain-model.md)
- [Low Level Design](./low-level-design.md)
- [System Design](./system-design.md)
- [Shopify Integration](./shopify-integration.md)
