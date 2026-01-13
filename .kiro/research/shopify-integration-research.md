# Shopify Integration Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on integrating with Shopify for florist catalog synchronization in the Bloom platform.

---

## Key APIs

### 1. Storefront API
- Public-facing API for customer experiences
- Read-only access to products, collections, checkout
- Uses access tokens (public or private)
- Best for: Displaying products to customers

### 2. Admin API (GraphQL)
- Full store management capabilities
- Requires OAuth authentication
- Access to products, inventory, orders, customers
- Best for: Backend integrations, order management

### 3. Webhooks
- Event-driven notifications
- Real-time updates for inventory, orders, products
- Reduces polling overhead

---

## Authentication: OAuth 2.0 Flow

### For Bloom (Multi-Store Integration)

1. Florist clicks "Connect Shopify Store" in Bloom
2. Redirect to Shopify OAuth authorization URL
3. Florist grants permissions in Shopify
4. Shopify redirects back with authorization code
5. Exchange code for access token
6. Store token securely (AWS Secrets Manager)

### Required Scopes for Bloom
```
read_products        # Access product catalog
read_inventory       # Check stock levels
read_orders          # View order history (optional)
write_orders         # Create orders from subscriptions
```

---

## Product Catalog Sync Strategy

### Initial Sync
1. On OAuth completion, fetch all products via Admin API
2. Store product metadata in Bloom database
3. Map Shopify product IDs to Bloom catalog

### Ongoing Sync Options

| Method | Pros | Cons |
|--------|------|------|
| Webhooks | Real-time, efficient | Requires webhook endpoint |
| Polling | Simple, reliable | Higher API usage, latency |
| Hybrid | Best of both | More complex |

### Recommended: Webhook + Daily Reconciliation
- Subscribe to `products/update`, `products/delete`, `inventory_levels/update`
- Daily job to reconcile and catch missed webhooks

---

## Webhook Implementation

### Key Webhooks for Bloom
```
products/create      # New product added
products/update      # Product details changed
products/delete      # Product removed
inventory_levels/update  # Stock changed
```

### Webhook Security
- Verify HMAC signature on all webhooks
- Use shared secret from app installation
- Respond with 200 OK within 5 seconds

### Webhook Endpoint Pattern
```
POST /webhooks/shopify/{florist_id}
Headers: X-Shopify-Hmac-SHA256, X-Shopify-Topic
```

---

## Multi-Store Management

### Data Model Considerations
```
Florist
├── shopify_store_domain
├── shopify_access_token (encrypted)
├── shopify_webhook_secret
└── last_sync_at

FloristProduct
├── florist_id
├── shopify_product_id
├── title, description, price
├── inventory_quantity
└── synced_at
```

### Token Storage
- Store access tokens in AWS Secrets Manager
- Reference by florist_id in database
- Rotate tokens if compromised

---

## API Rate Limits

### Shopify Rate Limits
- REST Admin API: 40 requests/second (leaky bucket)
- GraphQL Admin API: 1000 cost points/second
- Storefront API: No hard limit, but throttled

### Best Practices
- Use GraphQL for bulk operations (more efficient)
- Implement exponential backoff on 429 errors
- Cache product data locally

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. OAuth flow for florist store connection
2. Initial product sync on connection
3. Manual "Refresh Catalog" button
4. Store products in Bloom database

### Phase 2: Real-time
1. Webhook endpoints for product/inventory updates
2. Automatic catalog sync
3. Inventory availability checks before order creation

### Phase 3: Order Integration
1. Create draft orders in Shopify from Bloom subscriptions
2. Sync order status back to Bloom
3. Handle fulfillment webhooks

---

## Security Considerations

1. **Token Security**: Never expose access tokens to frontend
2. **Webhook Verification**: Always verify HMAC signatures
3. **Scope Minimization**: Request only needed permissions
4. **Token Rotation**: Implement token refresh mechanism

---

## Sources

- [Shopify Authentication Documentation](https://shopify.dev/docs/apps/build/authentication-authorization)
- [Storefront API Getting Started](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/getting-started)
- [Shopify API Overview](https://shopify.dev/docs/api)
- API2Cart - Shopify App Integration patterns
- Codilar - Shopify API Integrations Guide

*Content was rephrased for compliance with licensing restrictions*
