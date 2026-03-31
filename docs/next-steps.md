# Bloom: Next Steps for AWS Infrastructure Setup

## Overview

This document outlines all infrastructure requirements to begin Bloom development with a fully cloud-based architecture. All databases and services will run on AWS/cloud providers from day 1 to avoid environment discrepancies.

**Target Timeline:** Complete setup within 1 week

**Architecture:**
- **Neo4j Aura** (free tier) - Graph database for relationships
- **Amazon RDS PostgreSQL** - Relational database for transactions
- **AWS Cognito** - User authentication & management
- **AWS Secrets Manager** - Secure credential storage
- **Amazon S3** - File storage (delivery photos)
- **AWS SES** - Transactional email
- **CloudWatch** - Logging & monitoring

**Estimated Monthly Cost (Development):** ~$50/month

---

## Phase 1: AWS Infrastructure Requirements

**Owner:** AWS Administrator (Kiro)
**Timeline:** Days 1-3

### 1. AWS Cognito User Pool

**Resource Type:** AWS Cognito User Pool
**Name:** `bloom-dev-user-pool`
**Region:** `us-east-1`

**Configuration:**

```yaml
Standard Attributes:
  - email (required, used as username)

Custom Attributes:
  - custom:bloom_role (String, mutable)
    Description: User role (CUSTOMER, PROPERTY_MANAGER, FLORIST, ADMIN)
  - custom:property_id (String, mutable, optional)
    Description: Associated property UUID for customers
  - custom:subscription_status (String, mutable, optional)
    Description: Subscription status (CREATED, ACTIVE, PAUSED)

Sign-in Options:
  - Username: Email address
  - Case sensitivity: Case insensitive

Password Policy:
  - Minimum length: 12 characters
  - Require uppercase letters: Yes
  - Require lowercase letters: Yes
  - Require numbers: Yes
  - Require special characters: Yes
  - Password history: 5 (prevent reuse of last 5 passwords)
  - Temporary password validity: 7 days

Multi-Factor Authentication:
  - MFA enforcement: Optional (user can enable)
  - MFA methods: SMS, TOTP authenticator app

Email Configuration:
  - Email provider: Cognito default (Amazon SES integration)
  - Email verification: Required before account activation
  - Verification method: Code
  - From email: noreply@bloom.com (verify this domain in SES)

Account Recovery:
  - Recovery mechanisms: Email only
  - Recovery message customization: Default

Advanced Security:
  - Compromised credentials check: Enabled (AWS detects breaches)
  - Advanced security features: ENFORCED
```

**App Client Configuration:**

```yaml
App Client Name: bloom-web-client
App Client Type: Public (no client secret)

Authentication Flows:
  - ALLOW_USER_PASSWORD_AUTH: Enabled
  - ALLOW_REFRESH_TOKEN_AUTH: Enabled
  - ALLOW_USER_SRP_AUTH: Enabled (for future)

Token Expiration:
  - ID token: 60 minutes
  - Access token: 60 minutes
  - Refresh token: 30 days

OAuth 2.0 Settings:
  - Callback URLs: http://localhost:5173/auth/callback, https://dev.bloom.com/auth/callback
  - Sign-out URLs: http://localhost:5173, https://dev.bloom.com
  - Allowed OAuth flows: Authorization code grant
  - Allowed OAuth scopes: openid, email, profile

Attribute Permissions:
  - All attributes: Readable and writable
```

**Outputs Required:**
- User Pool ID (e.g., `us-east-1_XXXXXX`)
- User Pool ARN
- App Client ID
- Region
- Cognito Domain (e.g., `bloom-dev.auth.us-east-1.amazoncognito.com`)

---

### 2. Amazon RDS PostgreSQL (Development)

**Resource Type:** Amazon RDS Database Instance
**Identifier:** `bloom-dev-db`
**Region:** `us-east-1`

**Engine Configuration:**

```yaml
Engine: PostgreSQL
Engine Version: 15.5 (or latest 15.x)
DB Instance Class: db.t3.small
  - vCPUs: 2
  - Memory: 2 GB
  - Network Performance: Up to 5 Gbps

Storage:
  - Storage Type: General Purpose SSD (gp3)
  - Allocated Storage: 50 GB
  - Storage Autoscaling: Enabled
    - Maximum storage threshold: 100 GB
  - IOPS: 3000 (gp3 baseline)
  - Storage Throughput: 125 MB/s

Availability & Durability:
  - Multi-AZ Deployment: No (single-AZ for dev to save cost)
  - Deployment Option: Single DB Instance
```

**Database Configuration:**

```yaml
Database Name: bloom
Master Username: bloom_admin
Master Password: (auto-generate, store in Secrets Manager)

Port: 5432
Parameter Group: default.postgres15
Option Group: default:postgres-15

Public Accessibility: Yes (for developer access during development)
  Note: Will be changed to "No" for production with VPN/bastion access
```

**Network & Security:**

```yaml
VPC: Default VPC (or create new bloom-dev-vpc)

Security Group: bloom-dev-db-sg
Inbound Rules:
  - Type: PostgreSQL
    Protocol: TCP
    Port: 5432
    Source: 0.0.0.0/0 (will restrict to specific IPs once known)
    Description: Temporary open access for dev

  Future rules (add once App Runner created):
  - Source: App Runner security group
  - Source: Amplify build IPs (for migrations)
  - Source: Developer VPN IPs

Outbound Rules:
  - All traffic (default)

Subnet Group: Use default or create bloom-dev-subnet-group
Availability Zone: No preference (let AWS choose)
```

**Backup & Maintenance:**

```yaml
Backup:
  - Automated backups: Enabled
  - Backup retention period: 7 days
  - Backup window: 03:00-04:00 UTC
  - Copy tags to snapshots: Yes

Maintenance:
  - Auto minor version upgrade: Yes
  - Maintenance window: Sun 04:00-05:00 UTC

Performance Insights:
  - Enable Performance Insights: Yes
  - Retention period: 7 days (free tier)

Enhanced Monitoring:
  - Enable Enhanced Monitoring: Yes
  - Granularity: 60 seconds
  - Monitoring Role: Create new role (rds-monitoring-role)

Encryption:
  - Encryption at rest: Enabled
  - KMS Key: (default) aws/rds
  - Encryption in transit: Enforced via security group (require SSL)
```

**Deletion Protection:**
```yaml
Deletion Protection: Disabled (dev environment, need flexibility)
```

**Outputs Required:**
- Endpoint: `bloom-dev-db.xxxxxx.us-east-1.rds.amazonaws.com`
- Port: `5432`
- Database name: `bloom`
- Master username: `bloom_admin`
- Secret ARN: (where credentials are stored)
- Security Group ID: `sg-xxxxx`
- Resource ID: `db-xxxxx`

---

### 3. AWS Secrets Manager

**Resource Type:** AWS Secrets Manager Secrets
**Region:** `us-east-1`

**Secrets to Create:**

#### Secret 1: Database Credentials

```yaml
Secret Name: bloom/dev/database
Secret Type: Credentials for RDS database
Description: RDS PostgreSQL master credentials for bloom-dev-db

Value (JSON):
{
  "username": "bloom_admin",
  "password": "<auto-generated from RDS setup>",
  "host": "bloom-dev-db.xxxxxx.us-east-1.rds.amazonaws.com",
  "port": 5432,
  "dbname": "bloom",
  "engine": "postgres"
}

Encryption: Default KMS key (aws/secretsmanager)
Automatic Rotation: Enabled
  - Rotation Schedule: Every 30 days
  - Rotation Lambda: Use AWS-managed rotation function for PostgreSQL
Tags:
  - Environment: development
  - Project: bloom
  - ManagedBy: terraform (or manual)
```

#### Secret 2: JWT Secret

```yaml
Secret Name: bloom/dev/jwt-secret
Secret Type: Other type of secret
Description: JWT signing secret for Bloom API tokens

Value (Plaintext):
<Generate random 64-character string>
Example generation: openssl rand -base64 48

Encryption: Default KMS key
Automatic Rotation: Disabled (manual rotation when needed)
Tags:
  - Environment: development
  - Project: bloom
```

#### Secret 3: Shopify Webhook Secret

```yaml
Secret Name: bloom/dev/shopify-webhook-secret
Secret Type: Other type of secret
Description: Secret for verifying Shopify webhook signatures

Value (Plaintext):
<Placeholder for now - will be provided by Shopify when webhooks configured>
"PLACEHOLDER_REPLACE_WHEN_SHOPIFY_CONFIGURED"

Encryption: Default KMS key
Automatic Rotation: Disabled
Tags:
  - Environment: development
  - Project: bloom
  - Integration: shopify
```

#### Secret 4: Stripe API Key

```yaml
Secret Name: bloom/dev/stripe-api-key
Secret Type: Other type of secret
Description: Stripe secret key for payment processing

Value (Plaintext):
<Placeholder for now - will use Stripe test key when available>
"sk_test_PLACEHOLDER_REPLACE_WHEN_STRIPE_CONFIGURED"

Encryption: Default KMS key
Automatic Rotation: Disabled (Stripe keys rotated manually via dashboard)
Tags:
  - Environment: development
  - Project: bloom
  - Integration: stripe
```

#### Secret 5: Stripe Webhook Secret

```yaml
Secret Name: bloom/dev/stripe-webhook-secret
Secret Type: Other type of secret
Description: Secret for verifying Stripe webhook signatures

Value (Plaintext):
<Placeholder for now - provided by Stripe when webhook endpoint created>
"whsec_PLACEHOLDER_REPLACE_WHEN_STRIPE_CONFIGURED"

Encryption: Default KMS key
Automatic Rotation: Disabled
Tags:
  - Environment: development
  - Project: bloom
  - Integration: stripe
```

**Outputs Required:**
- Secret ARNs for all 5 secrets:
  - `arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:bloom/dev/database-XXXXX`
  - `arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:bloom/dev/jwt-secret-XXXXX`
  - `arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:bloom/dev/shopify-webhook-secret-XXXXX`
  - `arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:bloom/dev/stripe-api-key-XXXXX`
  - `arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:bloom/dev/stripe-webhook-secret-XXXXX`

---

### 4. Amazon S3 Bucket

**Resource Type:** Amazon S3 Bucket
**Bucket Name:** `bloom-dev-delivery-photos`
**Region:** `us-east-1`

**Bucket Configuration:**

```yaml
Bucket Versioning: Enabled

Encryption:
  - Default encryption: Server-side encryption (SSE-S3)
  - Bucket Key: Enabled (reduce encryption costs)

Public Access Settings:
  - Block all public access: Enabled
    - Block public ACLs: Yes
    - Ignore public ACLs: Yes
    - Block public bucket policies: Yes
    - Restrict public buckets: Yes
  - Access Method: Presigned URLs generated by backend only

Object Ownership:
  - Object Ownership: Bucket owner enforced (ACLs disabled)

Lifecycle Policy:
  - Rule Name: Archive old photos
  - Scope: All objects
  - Transitions:
    - After 90 days: Transition to Glacier Flexible Retrieval
    - After 365 days: Transition to Glacier Deep Archive
  - Expiration: Never (keep for audit purposes)
```

**CORS Configuration:**

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://app.blooms.now",
      "https://blooms.now"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowAppRunnerAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/bloom-dev-api-role"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::bloom-dev-delivery-photos/*"
    }
  ]
}
```

**Tags:**

```yaml
- Environment: development
- Project: bloom
- Purpose: delivery-photos
```

**Outputs Required:**
- Bucket name: `bloom-dev-delivery-photos`
- Bucket ARN: `arn:aws:s3:::bloom-dev-delivery-photos`
- Region: `us-east-1`

---

### 5. Amazon SES (Simple Email Service)

**Resource Type:** Amazon SES Configuration
**Region:** `us-east-1`

**Configuration:**

```yaml
Account Status: Sandbox mode (for development)
  Note: Sandbox allows sending to verified email addresses only
  Production will require moving to production access

Verified Identities:
  Email Addresses to Verify:
    - noreply@bloom.com (primary sender)
    - admin@bloom.com (for admin notifications)
    - [Add 3-5 developer email addresses for testing]

Domain Verification (if domain available):
  - Domain: bloom.com
  - DKIM: Enabled (generate DKIM records)
  - SPF: Add TXT record
  - DMARC: Configure policy

Email Sending:
  - Configuration Set: bloom-dev-emails
  - Track: Opens, clicks, bounces, complaints

Bounce and Complaint Handling:
  - SNS Topic: bloom-dev-email-notifications
  - Subscribe: [developer email or Slack webhook]

Sending Limits (Sandbox):
  - 200 emails per 24-hour period
  - 1 email per second
  - Can only send to verified addresses
```

**SMTP Credentials:**

```yaml
Create SMTP Credentials: Yes
Username: (auto-generated IAM access key)
Password: (auto-generated secret)
SMTP Endpoint: email-smtp.us-east-1.amazonaws.com
Port: 587 (TLS) or 465 (SSL)

Store in Secrets Manager:
  Secret Name: bloom/dev/ses-smtp-credentials
  Value:
    {
      "username": "AKIAXXXXXXXX",
      "password": "generated-smtp-password",
      "host": "email-smtp.us-east-1.amazonaws.com",
      "port": 587
    }
```

**IAM Policy for SES:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

**Outputs Required:**
- Verified sender email: `noreply@bloom.com`
- SMTP credentials (username/password)
- Configuration set name: `bloom-dev-emails`
- SNS topic ARN for notifications
- DKIM records (if domain configured)

---

### 6. CloudWatch Logs & Monitoring

**Resource Type:** CloudWatch Log Groups
**Region:** `us-east-1`

**Log Groups to Create:**

```yaml
Log Group 1:
  Name: /bloom/dev/api
  Retention: 30 days
  Encryption: Enabled (default KMS key)
  Description: Application logs from FastAPI backend

Log Group 2:
  Name: /bloom/dev/jobs
  Retention: 30 days
  Encryption: Enabled
  Description: Background job logs (EventBridge/Lambda)

Log Group 3:
  Name: /aws/lambda/bloom-dev
  Retention: 14 days
  Encryption: Enabled
  Description: AWS Lambda function logs (future use)

Log Group 4:
  Name: /aws/apprunner/bloom-dev-api
  Retention: 30 days
  Encryption: Enabled
  Description: App Runner service logs (when deployed)
```

**CloudWatch Dashboard:**

```yaml
Dashboard Name: bloom-dev-dashboard
Widgets:
  - API Request Count (from log insights)
  - API Error Rate (from log insights)
  - RDS CPU Utilization
  - RDS Freeable Memory
  - RDS Database Connections
  - S3 Bucket Size
  - S3 Request Count
```

**CloudWatch Alarms (Optional - can add later):**

```yaml
Alarm 1: RDS High CPU
  - Metric: CPUUtilization
  - Threshold: > 80% for 5 minutes
  - Action: Send SNS notification

Alarm 2: RDS Low Freeable Memory
  - Metric: FreeableMemory
  - Threshold: < 512 MB for 5 minutes
  - Action: Send SNS notification

Alarm 3: API High Error Rate
  - Metric: Custom metric from logs
  - Threshold: > 5% error rate
  - Action: Send SNS notification
```

**Outputs Required:**
- Log group ARNs for all 4 groups
- Dashboard URL
- SNS topic ARN for alarms (if created)

---

### 7. IAM Roles & Policies

**Resource Type:** IAM Roles and Policies
**Region:** Global (IAM is not region-specific)

#### Role 1: API Service Role

```yaml
Role Name: bloom-dev-api-role
Description: Role assumed by App Runner service and developers for API access
Trust Policy:
  - Service: apprunner.amazonaws.com
  - Service: ecs-tasks.amazonaws.com (for future ECS deployment)

Attached Policies:

Policy 1: SecretsManagerReadAccess
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - secretsmanager:GetSecretValue
          - secretsmanager:DescribeSecret
        Resource:
          - arn:aws:secretsmanager:us-east-1:*:secret:bloom/dev/*

Policy 2: S3DeliveryPhotosAccess
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - s3:GetObject
          - s3:PutObject
          - s3:DeleteObject
        Resource:
          - arn:aws:s3:::bloom-dev-delivery-photos/*
      - Effect: Allow
        Action:
          - s3:ListBucket
        Resource:
          - arn:aws:s3:::bloom-dev-delivery-photos

Policy 3: SESEmailSendAccess
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - ses:SendEmail
          - ses:SendRawEmail
        Resource: "*"

Policy 4: CloudWatchLogsAccess
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - logs:CreateLogStream
          - logs:PutLogEvents
          - logs:DescribeLogStreams
        Resource:
          - arn:aws:logs:us-east-1:*:log-group:/bloom/dev/*

Policy 5: RDSConnect (Optional - for IAM database authentication)
  PolicyDocument:
    Version: "2012-10-17"
    Statement:
      - Effect: Allow
        Action:
          - rds-db:connect
        Resource:
          - arn:aws:rds-db:us-east-1:*:dbuser:*/bloom_admin
```

#### Role 2: Developer Access Role

```yaml
Role Name: bloom-dev-developer-role
Description: Role for developers to access AWS resources during development
Trust Policy:
  - AWS Account: <ACCOUNT_ID>
  - IAM Users: <developer IAM users>

Attached Policies:
  - All policies from bloom-dev-api-role (above)
  - Additional: CognitoUserPoolAccess
      Action:
        - cognito-idp:AdminCreateUser
        - cognito-idp:AdminDeleteUser
        - cognito-idp:AdminGetUser
        - cognito-idp:AdminSetUserPassword
        - cognito-idp:ListUsers
        - cognito-idp:DescribeUserPool
      Resource:
        - arn:aws:cognito-idp:us-east-1:*:userpool/us-east-1_*
```

#### IAM User for Developers

```yaml
User Name: <developer-name>-bloom-dev
Groups: bloom-developers
Access Type: Programmatic access (Access Key)

Permissions:
  - Assume Role: bloom-dev-developer-role

Generate:
  - Access Key ID
  - Secret Access Key
  Note: Store securely, provide to developer via secure channel
```

**Outputs Required:**
- Role ARNs:
  - `arn:aws:iam::ACCOUNT:role/bloom-dev-api-role`
  - `arn:aws:iam::ACCOUNT:role/bloom-dev-developer-role`
- IAM User credentials:
  - Access Key ID
  - Secret Access Key
  - Instructions for AWS CLI configuration

---

### 8. EventBridge (Optional - For Future Background Jobs)

**Resource Type:** Amazon EventBridge Rules
**Region:** `us-east-1`

**Note:** This can be set up later, but including for completeness.

```yaml
Rule 1: Daily Delivery Generation
  Name: bloom-dev-generate-deliveries
  Schedule: cron(0 0 * * ? *) # Every day at midnight UTC
  Target: Lambda function (to be created)
  Description: Generate delivery records for next 7 days

Rule 2: Weekly Payout Calculation
  Name: bloom-dev-calculate-payouts
  Schedule: cron(0 9 ? * MON *) # Every Monday at 9 AM UTC
  Target: Lambda function (to be created)
  Description: Calculate florist payouts for previous week

Rule 3: Daily Product Sync
  Name: bloom-dev-sync-products
  Schedule: cron(0 3 * * ? *) # Every day at 3 AM UTC
  Target: Lambda function (to be created)
  Description: Sync products from Shopify for all florists
```

**Outputs Required:**
- Rule ARNs (when created)

---

## Phase 2: Neo4j Aura Setup

**Owner:** Developer (Can be done independently)
**Timeline:** Day 1 (can start immediately)

### Steps:

1. **Create Account:**
   - Go to https://console.neo4j.io
   - Sign up with work email
   - Verify email address

2. **Create Instance:**
   - Click "Create Instance"
   - Name: `bloom-dev`
   - Cloud Provider: AWS
   - Region: `us-east-1` (same as RDS for low latency)
   - Size: Free tier (200k nodes, 400k relationships, 50 MB)
   - Click "Create"

3. **Save Credentials:**
   - Username: `neo4j` (default)
   - Password: (auto-generated, save securely)
   - Connection URI: `neo4j+s://xxxxx.databases.neo4j.io`
   - Port: `7687`

4. **Test Connection:**
   - Use Neo4j Browser (in web console)
   - Run test query: `RETURN "Hello from Neo4j!" as message`

5. **Initialize Schema:**
   - Run Cypher scripts from `docs/low-level-design.md`
   - Create constraints (user email unique, etc.)
   - Create indexes (user role, property status, etc.)

**Information to Save:**
```yaml
NEO4J_URI: neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER: neo4j
NEO4J_PASSWORD: <generated-password>
NEO4J_DATABASE: neo4j (default)
```

**Estimated Time:** 15 minutes

---

## Phase 3: Post-Setup Actions

**Owner:** Developer
**Timeline:** Days 4-5

### 1. Environment Configuration

**Create `.env.local` file:**

```bash
# apps/api/.env.local

# Environment
ENVIRONMENT=development
DEBUG=true

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from IAM user>
AWS_SECRET_ACCESS_KEY=<from IAM user>

# Cognito
COGNITO_REGION=us-east-1
COGNITO_USER_POOL_ID=<from Cognito setup>
COGNITO_CLIENT_ID=<from Cognito setup>

# RDS PostgreSQL
DATABASE_URL=postgresql://bloom_admin:<password>@bloom-dev-db.xxxxx.us-east-1.rds.amazonaws.com:5432/bloom
# Or use Secrets Manager:
DB_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:bloom/dev/database

# Neo4j
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-password>

# S3
S3_BUCKET_NAME=bloom-dev-delivery-photos
S3_REGION=us-east-1

# SES
SES_FROM_EMAIL=noreply@bloom.com
SES_REGION=us-east-1

# Secrets Manager ARNs
JWT_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:bloom/dev/jwt-secret
SHOPIFY_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:bloom/dev/shopify-webhook-secret
STRIPE_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:bloom/dev/stripe-api-key
STRIPE_WEBHOOK_SECRET_ARN=arn:aws:secretsmanager:us-east-1:xxx:secret:bloom/dev/stripe-webhook-secret

# Feature Flags (Mock external services during development)
MOCK_SHOPIFY=true
MOCK_STRIPE=true

# Application
API_BASE_URL=http://localhost:8000
WEB_DOMAIN=http://localhost:5173
```

---

### 2. Test All Connections

**Create and run connection test script:**

```bash
cd apps/api
python scripts/test_connections.py
```

Expected output:
```
Testing connections...
✅ Neo4j connected!
✅ RDS connected!
✅ S3 connected! Wrote to bloom-dev-delivery-photos
✅ Cognito connected! Pool: bloom-dev-user-pool
All connections successful! 🎉
```

---

### 3. Initialize Database Schemas

**Neo4j Schema:**
```bash
# Run in Neo4j Browser (console.neo4j.io)
# Copy/paste Cypher from docs/low-level-design.md section:
# - Create constraints
# - Create indexes
```

**RDS Schema:**
```bash
cd apps/api

# Initialize Alembic (if not already done)
alembic init alembic

# Create initial migration
alembic revision -m "Create initial tables"

# Edit migration file to add table definitions

# Run migration
alembic upgrade head

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

---

### 4. Seed Test Data

**Run seeding script:**
```bash
cd apps/api
python scripts/seed_cloud.py
```

This will create:
- 4 test users in Cognito (customer, admin, florist, PM)
- 2-3 test properties in Neo4j
- 2-3 test florists in Neo4j
- Sample product data

**Test Credentials Created:**
```
Customer: customer@bloom.dev / DevPass123!
Admin: admin@bloom.dev / DevPass123!
Florist: florist@bloom.dev / DevPass123!
PM: pm@bloom.dev / DevPass123!
```

---

### 5. Start Local Development

**Terminal 1 - Backend:**
```bash
cd apps/api
uvicorn main:app --reload
# API running on http://localhost:8000
# Connects to AWS RDS, Neo4j Aura, Cognito
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
pnpm dev
# Frontend running on http://localhost:5173
```

**Terminal 3 - Logs:**
```bash
# Watch CloudWatch logs
aws logs tail /bloom/dev/api --follow
```

---

### 6. Verify API Endpoints

**Test authentication:**
```bash
# Register new user
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Should return tokens + user object

# Test login with seeded user
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bloom.dev",
    "password": "DevPass123!"
  }'

# Should return tokens
```

---

## Timeline Summary

| Day | Phase | Owner | Tasks | Status |
|-----|-------|-------|-------|--------|
| **Day 1** | Setup | Developer | Create Neo4j Aura account, send AWS request to admin | ⏳ Pending |
| **Day 2-3** | Infrastructure | AWS Admin (Kiro) | Set up Cognito, RDS, Secrets Manager, S3, SES, IAM | ⏳ Pending |
| **Day 4** | Validation | Developer | Test connections, initialize schemas | ⏳ Pending |
| **Day 5** | Development | Developer | Seed data, start building auth endpoints | ⏳ Pending |

---

## Success Criteria

Before proceeding with development, verify:

- [ ] Neo4j Aura instance accessible and schema initialized
- [ ] RDS PostgreSQL accessible and tables created via Alembic
- [ ] AWS Cognito user pool configured and test users created
- [ ] All 5 secrets stored in Secrets Manager
- [ ] S3 bucket created and presigned URL generation works
- [ ] SES verified sender email and can send test email
- [ ] CloudWatch log groups created
- [ ] IAM roles/policies configured with correct permissions
- [ ] Developer has AWS credentials (Access Key + Secret)
- [ ] Connection test script passes all checks
- [ ] Can successfully register and login via API
- [ ] Frontend can connect to local API which connects to cloud services

---

## Estimated Costs

### Development Environment (Monthly)

| Service | Configuration | Cost |
|---------|---------------|------|
| **RDS PostgreSQL** | db.t3.small, 50GB, Single-AZ | ~$40 |
| **Neo4j Aura** | Free tier | $0 |
| **Cognito** | < 1,000 MAUs | $0 |
| **S3** | < 10 GB storage, 1,000 requests | ~$1 |
| **SES** | Sandbox mode, < 1,000 emails | $0 |
| **Secrets Manager** | 5 secrets | ~$2 |
| **CloudWatch** | Logs + basic monitoring | ~$5 |
| **Data Transfer** | Minimal (dev traffic) | ~$2 |
| **Total** | | **~$50/month** |

### Scaling to Production (Future)

| Service | Configuration | Cost |
|---------|---------------|------|
| **RDS PostgreSQL** | db.r6g.large, 100GB, Multi-AZ | ~$200 |
| **Neo4j Aura** | Professional tier | ~$65 |
| **App Runner** | 2-10 instances, auto-scaling | ~$100 |
| **Amplify** | Frontend hosting + CDN | ~$15 |
| **ElastiCache Redis** | cache.t3.medium, Multi-AZ | ~$50 |
| **Other Services** | S3, SES, Secrets, CloudWatch | ~$20 |
| **Total** | | **~$450/month** |

---

## Contacts & Resources

**AWS Administrator:** Kiro
**Developer:** [Your Name]
**Project Repository:** https://github.com/kp-primereasoning/bloom

**Documentation:**
- Architecture Docs: `/docs/domain-model.md`, `/docs/high-level-design.md`, `/docs/low-level-design.md`
- Shopify Integration: `/docs/shopify-integration.md`
- Development Guide: `/docs/dev.md`

**External Services:**
- Neo4j Aura Console: https://console.neo4j.io
- AWS Console: https://console.aws.amazon.com
- Cognito Documentation: https://docs.aws.amazon.com/cognito
- RDS Documentation: https://docs.aws.amazon.com/rds

---

## Questions or Issues?

If any part of this setup is unclear or if you encounter issues:

1. **AWS-specific questions:** Contact Kiro (AWS admin)
2. **Neo4j questions:** Check Neo4j Aura documentation or support
3. **Development questions:** Review `/docs/` folder or reach out to team

---

**Last Updated:** 2024-01-20
**Version:** 1.0
