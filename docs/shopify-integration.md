# Shopify Integration Planning

## Business Model Overview

**Payment Flow:**
- Customer pays Bloom (Bloom is merchant of record)
- Bloom pays florist when delivery is marked complete
- Each florist has their own Shopify store

**Key Principle:** Shopify is the system of record for products and pricing (per florist)

---

## Product Mapping Strategy

### Concept
Florists browse their own Shopify product catalog and choose which product maps to each Bloom subscription tier.

### Florist Dashboard Flow

```
1. Florist connects Shopify store (OAuth)
   ↓
2. Bloom syncs all products from florist's store
   ↓
3. Florist maps products to tiers:
   - ESSENTIAL ($45/delivery) → "Seasonal Bouquet - Small" ($38 Shopify price)
   - SIGNATURE ($75/delivery) → "Designer's Choice - Medium" ($65 Shopify price)
   - STATEMENT ($125/delivery) → "Luxury Arrangement - Large" ($110 Shopify price)
   ↓
4. Florist can update mappings seasonally
```

### Benefits
- ✅ Florist controls which products are used
- ✅ Seasonal flexibility (spring tulips → summer roses)
- ✅ Clear margin visibility (Bloom price - Shopify cost = margin)
- ✅ Bloom's customer-facing pricing stays consistent

### Data Model (Neo4j)

```cypher
(:Florist {id: "uuid"})-[:OFFERS]->(:Product {
  shopify_product_id: "gid://shopify/Product/123",
  shopify_variant_id: "gid://shopify/ProductVariant/456",
  title: "Seasonal Bouquet - Small",
  price: 38.00,
  inventory_quantity: 12,
  image_url: "https://...",
  synced_at: datetime()
})

(:Florist)-[:MAPS_TO_TIER {
  tier: "ESSENTIAL",
  mapped_at: datetime(),
  active: true
}]->(:Product)
```

**Query Example:**
```cypher
// Get Essential tier product for a specific florist
MATCH (f:Florist {id: $florist_id})-[m:MAPS_TO_TIER {tier: 'ESSENTIAL', active: true}]->(p:Product)
RETURN p
```

---

## Order Creation Options

### Option 1: Create Draft Orders in Shopify

**How it works:**
```
Bloom delivery scheduled
  ↓
Create Shopify draft order in florist's store
  ↓
Florist sees it in Shopify admin (alongside their regular orders)
  ↓
Florist fulfills, marks complete in Shopify
  ↓
Webhook → Bloom updates delivery status → Trigger florist payout
```

**Pros:**
- ✅ Florists use familiar Shopify interface
- ✅ Inventory automatically decrements
- ✅ All orders in one place (Bloom + regular store)
- ✅ Shopify's built-in tools (packing slips, order history)

**Cons:**
- ❌ Draft orders can be confusing for florists
- ❌ Risk of florist accidentally charging customer
- ❌ Potential Shopify transaction fees if order converted
- ❌ Less control over florist workflow

---

### Option 2: Bloom-Only Orders (No Shopify Orders)

**How it works:**
```
Bloom delivery scheduled
  ↓
Display in Bloom Florist Dashboard only
  ↓
Florist marks complete in Bloom
  ↓
Bloom manually syncs inventory from Shopify (read-only)
```

**Pros:**
- ✅ Full control over florist UX
- ✅ No Shopify API limits or fees
- ✅ Clean separation (Shopify = catalog, Bloom = fulfillment)
- ✅ Can build custom features (batch fulfillment, route optimization)

**Cons:**
- ❌ Florists check two systems (Shopify + Bloom)
- ❌ Inventory doesn't auto-decrement
- ❌ Need to build all order management UI from scratch

---

### Option 3: Hybrid (Recommended)

**How it works:**
```
Bloom delivery scheduled
  ↓
Create "internal order" in Bloom system (RDS + Neo4j)
  ↓
Show in Bloom Florist Dashboard with rich context
  ↓
When florist marks complete:
    → Update Bloom delivery status
    → Use Shopify Inventory API to decrement stock
    → Optionally create Shopify order for record-keeping
  ↓
Trigger florist payout
```

**Pros:**
- ✅ Best UX in Bloom dashboard (purpose-built for subscriptions)
- ✅ Inventory stays accurate via API updates
- ✅ Optional Shopify order creation for florists who want historical records
- ✅ Can add Bloom-specific features (batch fulfillment, route optimization, delivery instructions)

**Cons:**
- ⚠️ More complex to build
- ⚠️ Need to handle inventory API failures gracefully

**Why this is best:**
- Gives Bloom full control over florist experience
- Shopify becomes a "product catalog + inventory backend"
- Can evolve UX without Shopify constraints
- Still maintains Shopify as source of truth for products/inventory

---

## Payment Flow Architecture

### Customer Billing (Stripe)

```
Customer subscribes on Bloom
  ↓
Create Stripe subscription (recurring billing)
  ↓
Charge customer weekly/monthly based on property's delivery cadence
  ↓
Money goes into Bloom's Stripe account
```

### Florist Payout (Stripe Connect)

```
Delivery marked complete by florist
  ↓
Calculate florist payout:
  - Customer paid: $75 (Signature tier)
  - Bloom commission: 30% ($22.50)
  - Florist receives: 70% ($52.50)
  ↓
Queue for weekly batch payout
  ↓
Stripe Connect transfer to florist's account
```

### Data Model (RDS)

```sql
-- Individual delivery line items for accounting
CREATE TABLE delivery_line_items (
  id UUID PRIMARY KEY,
  delivery_id UUID REFERENCES deliveries(id),
  florist_id UUID NOT NULL,  -- Neo4j reference
  shopify_product_id VARCHAR,
  customer_paid DECIMAL(10, 2),  -- What customer paid Bloom
  florist_payout DECIMAL(10, 2),  -- What florist receives
  bloom_commission DECIMAL(10, 2),  -- Bloom's cut
  commission_rate DECIMAL(3, 2),  -- e.g., 0.30 for 30%
  created_at TIMESTAMPTZ
);

-- Batch payouts to florists
CREATE TABLE florist_payouts (
  id UUID PRIMARY KEY,
  florist_id UUID NOT NULL,
  payout_period_start DATE,
  payout_period_end DATE,
  total_deliveries INT,
  gross_amount DECIMAL(10, 2),  -- Sum of customer payments
  commission_amount DECIMAL(10, 2),  -- Total Bloom commission
  net_amount DECIMAL(10, 2),  -- What florist receives
  stripe_transfer_id VARCHAR,
  status VARCHAR,  -- pending, processing, paid, failed
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);

-- Link deliveries to payouts
CREATE TABLE payout_deliveries (
  payout_id UUID REFERENCES florist_payouts(id),
  delivery_id UUID REFERENCES deliveries(id),
  PRIMARY KEY (payout_id, delivery_id)
);
```

---

## Technical Architecture

### Shopify API Integration Points

**1. Product Sync (Periodic)**
- **Frequency:** Daily or on-demand via florist dashboard button
- **API:** Shopify REST Admin API `/admin/api/2024-01/products.json`
- **Store in:** Neo4j (Product nodes with OFFERS relationship)
- **Include:** Product ID, variant ID, title, price, inventory quantity, images

**2. Inventory Updates (Real-time)**
- **Trigger:** When florist marks delivery complete
- **API:** Shopify Inventory API `POST /admin/api/2024-01/inventory_levels/set.json`
- **Action:** Decrement inventory by 1 for the fulfilled product variant

**3. Order Creation (Optional - for Option 1 or 3)**
- **Trigger:** When delivery is scheduled OR when marked complete (depending on approach)
- **API:** Shopify Draft Orders API or Orders API
- **Purpose:** Record-keeping in florist's Shopify admin

**4. Webhook Handling**
- **Events to subscribe to:**
  - `orders/fulfilled` - If using Shopify orders
  - `products/update` - Detect price/inventory changes
  - `products/delete` - Handle product discontinuation
- **Security:** Verify HMAC signature on all webhooks

### Security

**Shopify Access Tokens:**
- Store in AWS Secrets Manager (NOT in Neo4j directly)
- Neo4j stores ARN reference:
  ```cypher
  (:Florist {
    shopify_store_url: "brooklyn-blooms.myshopify.com",
    shopify_secret_arn: "arn:aws:secretsmanager:us-east-1:123:secret:florist-1-shopify"
  })
  ```

**Webhook Verification:**
```python
# Verify HMAC signature
computed_hmac = base64.b64encode(
    hmac.new(SHOPIFY_WEBHOOK_SECRET.encode(), request_body, hashlib.sha256).digest()
)
if not hmac.compare_digest(computed_hmac, x_shopify_hmac_sha256.encode()):
    raise HTTPException(401)
```

---

## Questions for Florist Conversations

### Order Management
- [ ] How do you currently manage orders? Shopify only, or other tools?
- [ ] What's your ideal workflow when you arrive at your shop each morning?
- [ ] Would you prefer to see Bloom orders in Shopify, a Bloom dashboard, or both?
- [ ] Do you fulfill deliveries in batches (e.g., all Monday deliveries at once) or throughout the day?

### Inventory
- [ ] How do you track inventory? Real-time in Shopify, or manual counts?
- [ ] What happens if you run out of a product mid-week?
- [ ] How should Bloom handle substitutions? (customer approval? florist's choice? equivalent tier product?)
- [ ] Do you want Bloom to automatically reserve inventory for scheduled deliveries?
- [ ] How far in advance do you need visibility into upcoming orders?

### Products
- [ ] How often do you change product offerings? (weekly? seasonally? rarely?)
- [ ] Would you want to map different products to each subscription tier, or use one "designer's choice" product for all?
- [ ] Should customers be able to request specific flowers/colors, or trust your design?
- [ ] Do you want customers to see product photos from your Shopify store, or generic Bloom images?

### Fulfillment & Delivery
- [ ] Do you deliver flowers yourself, or use a courier service?
- [ ] Do you need turn-by-turn directions for delivery routes?
- [ ] How do you handle delivery failures? (no access to building, customer not home)
- [ ] Would you want batch delivery route optimization?

### Payments
- [ ] How do you prefer to receive payment? (weekly? monthly? per-delivery?)
- [ ] What payout percentage/commission rate would make this worthwhile for you?
- [ ] Do you need detailed payout reports for accounting?

---

## Testing Strategy

### Shopify Development Stores
- Create 3 free development stores (partners.shopify.com)
- Example: `brooklyn-blooms-dev.myshopify.com`
- Seed with test products mapped to subscription tiers
- Use for local development and staging

### Mock Shopify API (Local Dev)
```python
# For fast local development without network calls
if os.getenv("MOCK_SHOPIFY") == "true":
    shopify_client = MockShopifyAPI()
```

### Webhook Testing
```bash
# Use ngrok to expose local API
ngrok http 8000

# Configure webhook in Shopify dev store
# Settings → Notifications → Webhooks
# URL: https://abc123.ngrok.io/webhooks/shopify/orders/fulfilled
```

### Shopify CLI
```bash
shopify webhook trigger orders/fulfilled
shopify products list
```

---

## Open Technical Decisions

### 1. Order Creation Approach
- **Decision needed:** Option 1 (Shopify draft orders), Option 2 (Bloom-only), or Option 3 (Hybrid)?
- **Depends on:** Florist feedback on preferred workflow
- **Recommendation:** Option 3 (Hybrid) for maximum control

### 2. Product Sync Frequency
- **Options:** Real-time (webhooks), daily batch, on-demand (manual button)
- **Consideration:** API rate limits (Shopify has 2 requests/second limit)
- **Recommendation:** Daily batch + on-demand manual sync button

### 3. Inventory Reservation
- **Question:** Should Bloom "reserve" inventory for scheduled deliveries, or only check at fulfillment time?
- **Consideration:** If florist has 5 of Product A, and 7 deliveries scheduled, how to handle?
- **Options:**
  - Optimistic: Don't reserve, handle shortages when they happen
  - Pessimistic: Reserve inventory, prevent over-scheduling
  - Hybrid: Warn florist if scheduled deliveries exceed inventory

### 4. Payout Timing
- **Options:**
  - Per-delivery: Immediate payout after completion (expensive, more Stripe fees)
  - Weekly batch: Every Monday for previous week's deliveries
  - Monthly batch: First of month for previous month
- **Recommendation:** Weekly batch (balance between cash flow and transaction costs)

### 5. Commission Rate
- **Question:** What % does Bloom take?
- **Considerations:**
  - Industry standard: 20-30% for marketplace platforms
  - Stripe fees: ~2.9% + $0.30
  - Net to florist should be competitive with their retail pricing
- **Recommendation:** Start with 25-30%, negotiate based on volume

---

## Success Metrics

### For Florists
- Time to fulfill average order (target: <5 min per order)
- Inventory accuracy (% of orders fulfilled without substitution)
- Payout accuracy (% of payouts with no disputes)
- Dashboard adoption (% using Bloom dashboard vs. calling support)

### For Bloom
- Product sync reliability (% successful syncs)
- Order creation success rate (% orders created without errors)
- Webhook processing latency (time from fulfillment to status update)
- API error rate (target: <1% of requests fail)

---

## Next Steps

1. **Florist Interviews** - Validate order management approach (Options 1, 2, or 3)
2. **Shopify OAuth Setup** - Build florist store connection flow
3. **Product Sync POC** - Test syncing products from dev store to Neo4j
4. **Florist Dashboard Mockups** - Design product mapping UI
5. **Payment Integration** - Set up Stripe Connect for florist payouts
6. **Webhook Infrastructure** - Build reliable webhook processing with retry logic

---

## Resources

- [Shopify Admin API Docs](https://shopify.dev/docs/api/admin-rest)
- [Shopify Webhooks Guide](https://shopify.dev/docs/apps/webhooks)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Neo4j Cypher Manual](https://neo4j.com/docs/cypher-manual/current/)
