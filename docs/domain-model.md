# Bloom Domain Model

## Business Context

**Bloom** is a property-based floral subscription orchestration platform that connects properties, florists, and residents. Bloom orchestrates floral deliveries without selling flowers directly - Shopify is the system of record for all products and pricing.

**Key Business Rules:**
- Bloom does NOT sell flowers (orchestration only)
- Shopify is the system of record for products and pricing
- One delivery cadence per property (no per-resident customization)
- Bloom controls florist assignment (residents cannot choose florists)
- Customer pays Bloom, Bloom pays florist on delivery completion

---

## Core Entities

### 1. User

**Description:** Represents all system users across four distinct roles.

**Attributes:**
- `id` (UUID) - Primary identifier
- `cognito_sub` (String) - AWS Cognito user identifier
- `email` (EmailStr) - Unique email address
- `role` (Enum) - User's role in the system
- `status` (Enum) - Account status
- `phone` (String, optional) - Contact number
- `name` (String, optional) - Full name
- `unit` (String, optional) - Apartment/unit number (CUSTOMER only)
- `subscription_status` (Enum, optional) - Subscription state (CUSTOMER only)
- `subscription_plan` (Enum, optional) - Selected plan tier (CUSTOMER only)
- `created_at` (DateTime) - Account creation timestamp
- `updated_at` (DateTime) - Last modification timestamp

**Enums:**
```
UserRole:
  - CUSTOMER: Residents who subscribe to floral deliveries
  - PROPERTY_MANAGER: Building/complex managers
  - FLORIST: Flower vendors connected to Bloom
  - ADMIN: Bloom platform administrators

UserStatus:
  - ACTIVE: User can access the system
  - ARCHIVED: Soft-deleted user (retain for audit trail)

SubscriptionStatus (CUSTOMER only):
  - CREATED: Account created, not yet activated
  - ACTIVE: Subscription active, deliveries scheduled
  - PAUSED: Temporarily suspended, no deliveries

SubscriptionPlan (CUSTOMER only):
  - ESSENTIAL: Basic tier ($45/delivery)
  - SIGNATURE: Premium tier ($75/delivery)
  - STATEMENT: Luxury tier ($125/delivery)
```

**Business Rules:**
- Email must be unique across all users
- Only CUSTOMER role can have unit, subscription_status, subscription_plan
- Only PROPERTY_MANAGER role can manage properties
- Only FLORIST role can be linked to Florist entity
- Users are soft-deleted (status = ARCHIVED) to preserve delivery history

**Relationships:**
- CUSTOMER → RESIDES_AT → Property (0..1)
- PROPERTY_MANAGER → MANAGES → Property (0..*)
- FLORIST user → WORKS_FOR → Florist entity (0..1)

---

### 2. Property

**Description:** Physical properties (apartment buildings, condos, offices) where deliveries occur.

**Attributes:**
- `id` (UUID) - Primary identifier
- `name` (String) - Property name (e.g., "Brooklyn Heights Towers")
- `address` (String) - Street address
- `city` (String) - City
- `state` (String) - US state code (2 characters)
- `zip_code` (String) - US ZIP code (5 or 9 digits)
- `delivery_cadence` (String, optional) - Delivery frequency (e.g., "WEEKLY_MONDAY")
- `delivery_instructions` (Text, optional) - Special delivery notes
- `created_at` (DateTime) - Property creation timestamp
- `updated_at` (DateTime) - Last modification timestamp

**Computed Attributes:**
- `status` (Enum) - Derived from relationships (see below)

**Enums:**
```
PropertyStatus (computed):
  - CREATED: Property created, no florist or PM assigned
  - PENDING_FLORIST: PM assigned, no florist assigned
  - PENDING_PM: Florist assigned, no PM assigned
  - ACTIVE: Both florist and PM assigned, ready for deliveries
  - ARCHIVED: Soft-deleted property
```

**Status Computation Logic:**
```
status = if (has_active_florist && has_property_manager) ? ACTIVE
       : if (has_active_florist) ? PENDING_PM
       : if (has_property_manager) ? PENDING_FLORIST
       : CREATED
```

**Business Rules:**
- One delivery cadence per property (applies to all residents)
- Property status auto-computes from relationships
- Must have both PM and florist to be ACTIVE
- Properties are soft-deleted (status = ARCHIVED)

**Relationships:**
- Property ← RESIDES_AT ← User (CUSTOMER)
- Property → MANAGED_BY → User (PROPERTY_MANAGER)
- Property → ASSIGNED_TO → Florist (many-to-many via active flag)
- Property ← Delivery (one-to-many)

---

### 3. Florist

**Description:** Floral businesses that fulfill deliveries. Each florist operates their own Shopify store.

**Attributes:**
- `id` (UUID) - Primary identifier
- `name` (String) - Display name
- `business_name` (String) - Legal business name
- `email` (EmailStr) - Contact email
- `phone` (String) - Contact number
- `address` (String) - Business address
- `status` (Enum) - Florist onboarding/operational status
- `shopify_store_url` (String, optional) - Shopify store domain (e.g., "brooklyn-blooms.myshopify.com")
- `shopify_secret_arn` (String, optional) - AWS Secrets Manager ARN for Shopify access token
- `stripe_account_id` (String, optional) - Stripe Connect account ID
- `commission_rate` (Decimal) - Bloom's commission (e.g., 0.30 for 30%)
- `created_at` (DateTime) - Florist creation timestamp
- `updated_at` (DateTime) - Last modification timestamp

**Enums:**
```
FloristStatus:
  - ONBOARDING: Florist account created, not yet ready
  - READY: Shopify connected, bank account linked, can receive deliveries
  - ARCHIVED: Soft-deleted florist
```

**Business Rules:**
- Each florist has one Shopify store
- Shopify access tokens stored in AWS Secrets Manager (not in database)
- Florist must connect Shopify and Stripe Connect before READY status
- Commission rate is per-florist (allows negotiation)
- Florists are soft-deleted (status = ARCHIVED)

**Relationships:**
- Florist ← ASSIGNED_TO ← Property (many-to-many via active flag)
- Florist → OFFERS → Product (one-to-many)
- Florist → MAPS_TO_TIER → Product (many-to-many for subscription tier mapping)
- Florist ← WORKS_FOR ← User (FLORIST role)

---

### 4. Product

**Description:** Floral products synced from florist's Shopify store.

**Attributes:**
- `id` (UUID) - Bloom's internal identifier
- `shopify_product_id` (String) - Shopify product GID
- `shopify_variant_id` (String) - Shopify variant GID (unique)
- `title` (String) - Product name
- `description` (Text, optional) - Product description
- `price` (Decimal) - Product price (from Shopify)
- `currency` (String) - Currency code (USD, CAD, etc.)
- `inventory_quantity` (Integer) - Available stock
- `image_url` (String, optional) - Product image URL
- `sku` (String, optional) - Stock keeping unit
- `synced_at` (DateTime) - Last Shopify sync timestamp
- `created_at` (DateTime) - First sync timestamp

**Business Rules:**
- Products are read-only in Bloom (Shopify is source of truth)
- Each Shopify variant is a separate Product in Bloom
- Products sync daily or on-demand via florist dashboard
- Inventory quantity updated when deliveries fulfilled
- Product price is informational (Bloom's subscription price is separate)

**Relationships:**
- Product ← OFFERS ← Florist (one-to-many)
- Product ← MAPS_TO_TIER ← Florist (subscription tier mapping)

---

### 5. Delivery

**Description:** Scheduled or completed floral delivery to a customer's property.

**Attributes:**
- `id` (UUID) - Primary identifier
- `user_id` (UUID) - References User (CUSTOMER)
- `property_id` (UUID) - References Property
- `florist_id` (UUID) - References Florist
- `subscription_plan` (Enum) - Tier at time of delivery
- `status` (Enum) - Delivery lifecycle status
- `scheduled_for` (DateTime) - Planned delivery date/time
- `delivered_at` (DateTime, optional) - Actual delivery timestamp
- `shopify_product_id` (String, optional) - Product used (snapshot)
- `product_title` (String, optional) - Product name (snapshot)
- `product_price` (Decimal, optional) - Product price (snapshot)
- `delivery_instructions` (Text, optional) - Special instructions
- `delivery_photo_url` (String, optional) - S3 URL of delivery proof photo
- `delivery_notes` (Text, optional) - Florist's notes
- `created_at` (DateTime) - Delivery record creation
- `updated_at` (DateTime) - Last status update
- `archived_at` (DateTime, optional) - Soft delete timestamp
- `cancelled_at` (DateTime, optional) - Cancellation timestamp

**Enums:**
```
DeliveryStatus:
  - SCHEDULED: Delivery planned for future date
  - DELIVERED: Successfully completed
  - SKIPPED: Customer chose to skip this delivery
  - MISSED: Delivery attempted but failed (no access, etc.)
  - CANCELLED: Delivery cancelled (by customer or admin)
```

**Status Transitions:**
```
SCHEDULED → DELIVERED (florist marks complete)
SCHEDULED → MISSED (florist marks as failed)
SCHEDULED → SKIPPED (customer pauses subscription)
SCHEDULED → CANCELLED (customer or admin cancels)
```

**Business Rules:**
- Deliveries auto-generate based on property delivery_cadence and customer subscription
- Product details are snapshots (preserve historical data even if product changes)
- Delivery photo required for DELIVERED status (proof of delivery)
- Deliveries are soft-deleted (archived_at) to preserve financial records
- Delivery triggers florist payout calculation when status = DELIVERED

**Relationships:**
- Delivery → User (CUSTOMER)
- Delivery → Property
- Delivery → Florist
- Delivery → DeliveryLineItem (financial breakdown)

---

### 6. DeliveryLineItem

**Description:** Financial accounting record for each delivery (links delivery to payout).

**Attributes:**
- `id` (UUID) - Primary identifier
- `delivery_id` (UUID) - References Delivery
- `florist_id` (UUID) - References Florist
- `customer_paid` (Decimal) - Amount customer paid Bloom
- `florist_payout` (Decimal) - Amount florist receives
- `bloom_commission` (Decimal) - Bloom's commission amount
- `commission_rate` (Decimal) - Commission % at time of delivery
- `shopify_order_id` (String, optional) - Shopify order reference
- `shopify_order_number` (String, optional) - Human-readable order #
- `created_at` (DateTime) - Line item creation

**Business Rules:**
- One line item per delivery
- customer_paid = florist_payout + bloom_commission
- florist_payout = customer_paid × (1 - commission_rate)
- Created when delivery status = DELIVERED
- Immutable once created (audit trail)

**Relationships:**
- DeliveryLineItem → Delivery (many-to-one)
- DeliveryLineItem → Florist (for payout grouping)
- DeliveryLineItem ← PayoutDelivery ← FloristPayout (payout aggregation)

---

### 7. FloristPayout

**Description:** Batch payment from Bloom to florist for completed deliveries.

**Attributes:**
- `id` (UUID) - Primary identifier
- `florist_id` (UUID) - References Florist
- `payout_period_start` (Date) - Start of payout period (e.g., Monday)
- `payout_period_end` (Date) - End of payout period (e.g., Sunday)
- `total_deliveries` (Integer) - Number of deliveries in period
- `gross_amount` (Decimal) - Sum of customer payments
- `commission_amount` (Decimal) - Sum of Bloom commissions
- `net_amount` (Decimal) - Total payout to florist
- `stripe_transfer_id` (String, optional) - Stripe Connect transfer ID
- `stripe_transfer_status` (String, optional) - Stripe transfer status
- `status` (Enum) - Payout lifecycle status
- `processed_at` (DateTime, optional) - When payout calculated
- `paid_at` (DateTime, optional) - When Stripe transfer succeeded
- `created_by` (UUID, optional) - Admin who created payout
- `approved_by` (UUID, optional) - Admin who approved payout
- `approved_at` (DateTime, optional) - Approval timestamp
- `created_at` (DateTime) - Payout creation
- `updated_at` (DateTime) - Last status update

**Enums:**
```
PayoutStatus:
  - pending: Payout calculated, awaiting admin approval
  - processing: Approved, Stripe transfer initiated
  - paid: Stripe transfer succeeded
  - failed: Stripe transfer failed (retry needed)
```

**Status Transitions:**
```
pending → processing (admin approves)
processing → paid (Stripe confirms transfer)
processing → failed (Stripe transfer fails)
failed → processing (admin retries)
```

**Business Rules:**
- Payouts typically run weekly (e.g., every Monday for previous week)
- Only deliveries with status = DELIVERED are included
- Admin approval required before Stripe transfer
- net_amount = gross_amount - commission_amount
- Failed payouts can be retried

**Relationships:**
- FloristPayout → Florist (many-to-one)
- FloristPayout → PayoutDelivery → DeliveryLineItem (payout composition)

---

### 8. CustomerBilling

**Description:** Customer's Stripe subscription and billing details.

**Attributes:**
- `id` (UUID) - Primary identifier
- `user_id` (UUID) - References User (CUSTOMER)
- `stripe_customer_id` (String) - Stripe customer ID
- `stripe_subscription_id` (String, optional) - Stripe subscription ID
- `stripe_payment_method_id` (String, optional) - Default payment method
- `subscription_plan` (Enum) - Customer's plan tier
- `billing_period` (Enum) - Billing frequency
- `amount` (Decimal) - Subscription amount per period
- `currency` (String) - Currency code
- `status` (Enum) - Billing status
- `current_period_start` (Date, optional) - Current billing period start
- `current_period_end` (Date, optional) - Current billing period end
- `created_at` (DateTime) - Billing record creation
- `updated_at` (DateTime) - Last update
- `cancelled_at` (DateTime, optional) - Cancellation timestamp

**Enums:**
```
BillingPeriod:
  - weekly: Charged every week
  - biweekly: Charged every 2 weeks
  - monthly: Charged every month

BillingStatus:
  - active: Subscription active, auto-charging
  - paused: Temporarily suspended
  - cancelled: Subscription ended
  - past_due: Payment failed, retry in progress
```

**Business Rules:**
- Billing period typically matches property delivery_cadence
- Stripe handles recurring billing (Bloom doesn't store card details)
- Past_due status triggers dunning workflow
- Cancellation retains record for history

**Relationships:**
- CustomerBilling → User (CUSTOMER) (one-to-one)
- CustomerBilling ← PaymentTransaction (billing history)

---

### 9. PaymentTransaction

**Description:** Individual payment charges from customer to Bloom.

**Attributes:**
- `id` (UUID) - Primary identifier
- `user_id` (UUID) - References User (CUSTOMER)
- `billing_id` (UUID) - References CustomerBilling
- `stripe_payment_intent_id` (String) - Stripe payment intent ID
- `stripe_charge_id` (String, optional) - Stripe charge ID
- `amount` (Decimal) - Charge amount
- `currency` (String) - Currency code
- `status` (Enum) - Payment status
- `failure_reason` (Text, optional) - Why payment failed
- `description` (Text, optional) - Charge description
- `receipt_url` (String, optional) - Stripe receipt URL
- `created_at` (DateTime) - Transaction timestamp
- `updated_at` (DateTime) - Last status update

**Enums:**
```
PaymentStatus:
  - succeeded: Payment successful
  - failed: Payment declined or error
  - refunded: Payment refunded to customer
  - disputed: Customer disputed charge
```

**Business Rules:**
- One transaction per billing cycle per customer
- Failed payments trigger retry logic (Stripe Smart Retries)
- Refunds create new transaction record (audit trail)
- Disputes require admin review

**Relationships:**
- PaymentTransaction → User (CUSTOMER)
- PaymentTransaction → CustomerBilling

---

## Relationships & Cardinality

### User Relationships

```
User (CUSTOMER) -[RESIDES_AT]-> Property
  Cardinality: Many-to-One
  Description: Customers live at one property
  Attributes: joined_at, move_in_date

User (PROPERTY_MANAGER) -[MANAGES]-> Property
  Cardinality: One-to-Many
  Description: PMs can manage multiple properties
  Attributes: assigned_at

User (FLORIST) -[WORKS_FOR]-> Florist
  Cardinality: Many-to-One
  Description: Florist employees linked to florist business
  Attributes: hired_at, position
```

### Property Relationships

```
Property -[ASSIGNED_TO]-> Florist
  Cardinality: Many-to-Many (with active flag)
  Description: Properties can have florist assignment history
  Attributes: active (boolean), created_at, deactivated_at
  Business Rule: Only ONE active assignment per property at a time

Property -[MANAGED_BY]-> User (PROPERTY_MANAGER)
  Cardinality: Many-to-One
  Description: Each property has one PM
  Attributes: assigned_at
```

### Florist Relationships

```
Florist -[OFFERS]-> Product
  Cardinality: One-to-Many
  Description: Florist's product catalog (synced from Shopify)
  Attributes: synced_at

Florist -[MAPS_TO_TIER]-> Product
  Cardinality: Many-to-Many
  Description: Which products are used for which subscription tiers
  Attributes: tier (ESSENTIAL/SIGNATURE/STATEMENT), active, mapped_at, unmapped_at
  Business Rule: One active mapping per tier per florist
```

### Delivery Relationships

```
Delivery -> User (CUSTOMER)
  Cardinality: Many-to-One
  Description: Deliveries belong to customers
  Foreign Key: user_id (UUID, stored in RDS)

Delivery -> Property
  Cardinality: Many-to-One
  Description: Deliveries go to properties
  Foreign Key: property_id (UUID, stored in RDS)

Delivery -> Florist
  Cardinality: Many-to-One
  Description: Florists fulfill deliveries
  Foreign Key: florist_id (UUID, stored in RDS)

Delivery -> DeliveryLineItem
  Cardinality: One-to-One
  Description: Financial breakdown of delivery
```

### Payout Relationships

```
FloristPayout -[INCLUDES]-> DeliveryLineItem
  Cardinality: One-to-Many (via PayoutDelivery junction)
  Description: Which deliveries are in which payout batch

FloristPayout -> Florist
  Cardinality: Many-to-One
  Description: Payouts belong to florists
```

---

## Domain Events

### Customer Lifecycle Events

```
CustomerRegistered
  - Triggered: User completes registration
  - Effects:
    - Create Cognito user
    - Create Neo4j User node
    - Send verification email

CustomerVerifiedEmail
  - Triggered: Cognito email confirmation
  - Effects:
    - Update User status to ACTIVE
    - Send welcome email

CustomerSelectedProperty
  - Triggered: User assigns property during onboarding
  - Effects:
    - Create RESIDES_AT relationship
    - Update property resident count

CustomerActivatedSubscription
  - Triggered: User selects plan and confirms
  - Effects:
    - Create Stripe customer
    - Create Stripe subscription
    - Create CustomerBilling record
    - Generate initial delivery schedule
    - Send confirmation email

CustomerPausedSubscription
  - Triggered: User pauses subscription
  - Effects:
    - Update User.subscription_status = PAUSED
    - Cancel future scheduled deliveries
    - Pause Stripe subscription
    - Send confirmation email

CustomerCancelledSubscription
  - Triggered: User cancels subscription
  - Effects:
    - Cancel Stripe subscription
    - Cancel future deliveries
    - Send exit survey email
```

### Delivery Lifecycle Events

```
DeliveryScheduled
  - Triggered: Auto-generated based on property cadence
  - Effects:
    - Create Delivery record with status = SCHEDULED
    - Send reminder email to customer (24h before)
    - Notify florist of upcoming delivery

DeliveryCompleted
  - Triggered: Florist marks delivery as DELIVERED
  - Effects:
    - Update Delivery.status = DELIVERED
    - Set Delivery.delivered_at timestamp
    - Create DeliveryLineItem (financial record)
    - Add to florist's pending earnings
    - Send delivery confirmation to customer
    - Update Shopify inventory (decrement)

DeliveryMissed
  - Triggered: Florist marks delivery as MISSED
  - Effects:
    - Update Delivery.status = MISSED
    - Send notification to customer
    - Send notification to PM
    - Create support ticket for resolution

DeliveryCancelled
  - Triggered: Customer or admin cancels delivery
  - Effects:
    - Update Delivery.status = CANCELLED
    - Set Delivery.cancelled_at timestamp
    - Issue refund (if already charged)
    - Notify florist to skip delivery
```

### Florist Events

```
FloristOnboarded
  - Triggered: Admin creates florist account
  - Effects:
    - Create Florist node in Neo4j
    - Create FLORIST user account
    - Send onboarding email with Shopify/Stripe connect links

FloristConnectedShopify
  - Triggered: Florist completes Shopify OAuth
  - Effects:
    - Store Shopify access token in Secrets Manager
    - Update Florist.shopify_store_url
    - Trigger initial product sync
    - Enable product mapping UI

FloristMappedProducts
  - Triggered: Florist maps products to subscription tiers
  - Effects:
    - Create MAPS_TO_TIER relationships
    - Update Florist.status = READY (if Stripe also connected)
    - Enable property assignments

FloristPayoutGenerated
  - Triggered: Weekly payout job runs (Monday mornings)
  - Effects:
    - Create FloristPayout record (status = pending)
    - Link all DELIVERED deliveries from period
    - Calculate totals (gross, commission, net)
    - Send payout summary email to florist
    - Notify admin for approval

FloristPayoutPaid
  - Triggered: Stripe Connect transfer succeeds
  - Effects:
    - Update FloristPayout.status = paid
    - Set FloristPayout.paid_at timestamp
    - Send payment confirmation email to florist
```

### Property Events

```
PropertyCreated
  - Triggered: Admin creates property
  - Effects:
    - Create Property node in Neo4j
    - Set initial status = CREATED
    - Available for PM assignment

PropertyAssignedFlorist
  - Triggered: Admin assigns florist to property
  - Effects:
    - Create ASSIGNED_TO relationship (active = true)
    - Recompute property status
    - If now ACTIVE: Enable resident subscriptions

PropertyAssignedPM
  - Triggered: Admin assigns property manager
  - Effects:
    - Create MANAGED_BY relationship
    - Recompute property status
    - Send welcome email to PM
```

### Payment Events

```
PaymentSucceeded
  - Triggered: Stripe webhook payment_intent.succeeded
  - Effects:
    - Create PaymentTransaction (status = succeeded)
    - Update CustomerBilling.current_period_end
    - Send receipt email to customer

PaymentFailed
  - Triggered: Stripe webhook payment_intent.payment_failed
  - Effects:
    - Create PaymentTransaction (status = failed)
    - Update CustomerBilling.status = past_due
    - Send payment failure email to customer
    - Trigger Stripe Smart Retry

SubscriptionCancelled
  - Triggered: Stripe webhook customer.subscription.deleted
  - Effects:
    - Update CustomerBilling.status = cancelled
    - Cancel future deliveries
    - Send cancellation confirmation email
```

---

## Business Constraints & Invariants

### Data Integrity Constraints

1. **User Email Uniqueness**
   - One email per user across all roles
   - Enforced by: Neo4j unique constraint + Cognito

2. **Property-Florist Assignment**
   - Only ONE active florist assignment per property at a time
   - Enforced by: Application logic (service layer)

3. **Subscription Plan Pricing**
   - ESSENTIAL = $45, SIGNATURE = $75, STATEMENT = $125
   - Enforced by: Application constants

4. **Commission Rate**
   - 0.20 ≤ commission_rate ≤ 0.40 (20%-40%)
   - Enforced by: Database constraint + validation

5. **Delivery Scheduling**
   - scheduled_for must be in the future when status = SCHEDULED
   - Enforced by: Application logic

6. **Payout Period**
   - payout_period_end must be after payout_period_start
   - Enforced by: Database constraint

### Business Logic Invariants

1. **Property Status Derivation**
   ```
   ACTIVE ⇔ (has_active_florist ∧ has_property_manager)
   PENDING_PM ⇔ (has_active_florist ∧ ¬has_property_manager)
   PENDING_FLORIST ⇔ (¬has_active_florist ∧ has_property_manager)
   CREATED ⇔ (¬has_active_florist ∧ ¬has_property_manager)
   ```

2. **Delivery Financial Integrity**
   ```
   customer_paid = florist_payout + bloom_commission
   florist_payout = customer_paid × (1 - commission_rate)
   ```

3. **Payout Composition**
   ```
   FloristPayout.net_amount = Σ(DeliveryLineItem.florist_payout)
   FloristPayout.gross_amount = Σ(DeliveryLineItem.customer_paid)
   FloristPayout.commission_amount = gross_amount - net_amount
   ```

4. **Customer Subscription State**
   - Can only activate subscription if property assigned
   - Can only receive deliveries if subscription_status = ACTIVE
   - Pausing subscription cancels future deliveries (but retains billing)

5. **Florist Readiness**
   - Florist.status = READY ⇔ (shopify_connected ∧ stripe_connected)
   - Only READY florists can be assigned to properties

---

## Aggregate Roots

**Aggregate:** A cluster of domain objects treated as a single unit for data changes.

### 1. User Aggregate

**Root:** User
**Entities:** User only (simple aggregate)
**Invariants:**
- Email uniqueness
- Role-appropriate attributes (e.g., only CUSTOMER has subscription_plan)
- Status transitions (ACTIVE ↔ ARCHIVED only)

**Operations:**
- Register user
- Update profile
- Archive user

---

### 2. Property Aggregate

**Root:** Property
**Related Entities:**
- Florist (via ASSIGNED_TO relationship)
- User (PM via MANAGED_BY relationship)
- User (Customers via RESIDES_AT relationship)

**Invariants:**
- Only one active florist assignment
- Status derives from relationships
- Delivery cadence applies to all residents

**Operations:**
- Create property
- Assign florist
- Assign property manager
- Update delivery cadence
- Archive property

---

### 3. Delivery Aggregate

**Root:** Delivery
**Entities:**
- Delivery
- DeliveryLineItem (composition)

**Invariants:**
- Delivery status transitions are valid
- DeliveryLineItem created only when status = DELIVERED
- Product snapshot preserved (immutable)

**Operations:**
- Schedule delivery
- Mark delivered (with photo)
- Mark missed
- Cancel delivery

---

### 4. Florist Aggregate

**Root:** Florist
**Entities:**
- Florist
- Product (via OFFERS relationship)
- ProductMapping (via MAPS_TO_TIER relationship)

**Invariants:**
- One active product mapping per subscription tier
- Shopify store URL is unique
- Status = READY requires both Shopify and Stripe connected

**Operations:**
- Create florist
- Connect Shopify
- Sync products
- Map products to tiers
- Connect Stripe
- Archive florist

---

### 5. Payout Aggregate

**Root:** FloristPayout
**Entities:**
- FloristPayout
- PayoutDelivery (junction)
- DeliveryLineItem (referenced)

**Invariants:**
- Payout amount equals sum of included delivery line items
- Only DELIVERED deliveries can be included
- Status transitions are sequential (pending → processing → paid/failed)

**Operations:**
- Generate payout
- Approve payout
- Process payout (Stripe transfer)
- Retry failed payout

---

## Domain Services

Services that don't naturally belong to a single entity.

### 1. DeliverySchedulingService

**Responsibility:** Generate delivery schedules based on property cadence and customer subscriptions.

**Operations:**
- `generateWeeklyDeliveries(property_id)` - Create deliveries for next week
- `cancelFutureDeliveries(user_id)` - Cancel all SCHEDULED deliveries for user
- `rescheduleDelivery(delivery_id, new_date)` - Move delivery to different date

---

### 2. PayoutCalculationService

**Responsibility:** Calculate florist payouts from delivered orders.

**Operations:**
- `calculatePayout(florist_id, start_date, end_date)` - Generate payout record
- `approvePayout(payout_id, admin_id)` - Approve payout for processing
- `processPayout(payout_id)` - Execute Stripe Connect transfer

---

### 3. ProductSyncService

**Responsibility:** Sync products from Shopify to Neo4j.

**Operations:**
- `syncFloristProducts(florist_id)` - Fetch all products from Shopify, upsert to Neo4j
- `updateInventory(product_id, quantity_change)` - Update inventory after delivery
- `handleProductDeleted(shopify_product_id)` - Handle Shopify product deletion

---

### 4. PropertyStatusService

**Responsibility:** Compute and update property status based on relationships.

**Operations:**
- `recomputeStatus(property_id)` - Recalculate status from graph relationships
- `getPropertyWithStatus(property_id)` - Get property with computed status

---

### 5. EmailNotificationService

**Responsibility:** Send transactional emails via AWS SES.

**Operations:**
- `sendWelcomeEmail(user_id)`
- `sendDeliveryConfirmation(delivery_id)`
- `sendPayoutNotification(payout_id)`
- `sendPaymentFailureNotification(user_id)`

---

## Ubiquitous Language

| Term | Definition |
|------|------------|
| **Property** | Apartment building, condo, or office complex where deliveries occur |
| **Resident** | Customer (USER with CUSTOMER role) who lives at a property |
| **Property Manager (PM)** | Building manager responsible for property operations |
| **Florist** | Floral business that fulfills deliveries |
| **Subscription Plan** | Tiered offering (ESSENTIAL, SIGNATURE, STATEMENT) with different price points |
| **Delivery Cadence** | Frequency of deliveries at a property (e.g., weekly, biweekly) |
| **Orchestration** | Bloom's role - coordinate deliveries without selling flowers directly |
| **System of Record** | Shopify is the authoritative source for products and pricing |
| **Product Mapping** | Florist's selection of which Shopify products to use for each subscription tier |
| **Commission Rate** | Percentage Bloom takes from each delivery (e.g., 30%) |
| **Payout** | Batch payment from Bloom to florist for completed deliveries |
| **Delivery Line Item** | Financial breakdown of a single delivery (customer payment, florist payout, commission) |
| **Onboarding** | Multi-step process for customers (register → select property → choose plan → activate) |
| **Soft Delete** | Archiving records by setting status/flag instead of deleting from database |
| **Enriched Response** | API response with resolved relationships (e.g., property with florist name, resident count) |

---

## Future Considerations

### Potential New Entities

1. **CustomerPreferences**
   - Flower color preferences
   - Allergy information
   - Delivery time preferences

2. **Promotion**
   - Discount codes
   - Referral bonuses
   - Seasonal promotions

3. **DeliveryRoute**
   - Optimized route for florist's daily deliveries
   - Turn-by-turn navigation
   - Batch delivery efficiency

4. **PropertyAmenity**
   - Delivery instructions per building entrance
   - Doorman contact info
   - Access codes

5. **SupportTicket**
   - Customer support issues
   - Delivery problem resolution
   - Refund requests

### Scalability Considerations

1. **Multi-Market Expansion**
   - Add `region` or `market` to Property
   - Florist service areas (geographic boundaries)
   - Multi-currency support

2. **Product Variants**
   - Seasonal product swaps
   - A/B testing different products for same tier
   - Customer product preferences within tier

3. **Dynamic Pricing**
   - Surge pricing during holidays
   - Volume discounts for properties
   - Loyalty rewards

4. **Analytics Aggregates**
   - Pre-computed metrics for dashboards
   - Florist performance scores
   - Customer lifetime value

---

## References

- [High Level Design](./high-level-design.md)
- [Low Level Design](./low-level-design.md)
- [System Design](./system-design.md)
- [Shopify Integration](./shopify-integration.md)
