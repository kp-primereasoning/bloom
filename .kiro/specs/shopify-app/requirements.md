# Requirements Document

## Introduction

The Bloom Shopify App is an embedded Shopify application that enables florists to connect their existing Shopify store to the Bloom platform. The app orchestrates product catalog synchronization, tier mapping, webhook-driven updates, and the florist onboarding flow. It serves as the bridge between a florist's Shopify store (system of record for products and pricing) and the Bloom backend API (orchestration layer for property-based floral subscriptions).

A working scaffold already exists at `apps/shopify/` with OAuth, Prisma session storage, basic routes, and Polaris UI. This spec covers building out the complete production-ready functionality.

## Glossary

- **Shopify_App**: The embedded Remix application installed in a florist's Shopify admin, built with Polaris UI components
- **Bloom_API**: The FastAPI backend at `apps/api/` that manages florists, properties, deliveries, and subscriptions
- **Florist**: A flower vendor who connects their Shopify store to Bloom to fulfill subscription deliveries
- **Shop_Connection**: A persistent record linking a Shopify store domain to a Bloom florist account, stored in the Shopify app's Prisma database
- **Product_Sync**: The process of reading products from a florist's Shopify store via GraphQL and sending them to the Bloom API
- **Tier_Mapping**: The association between a Shopify product and a Bloom subscription tier (ESSENTIAL, SIGNATURE, or STATEMENT)
- **Bloom_API_Key**: A secret credential issued by Bloom that authenticates the Shopify app's requests to the Bloom API
- **Webhook_Handler**: A server-side endpoint that receives and processes event notifications from Shopify (product updates, deletions, app uninstalls)
- **Onboarding_Flow**: The three-step guided process for florists: Link Store → Link Products → Turn on Deliveries
- **Polaris**: Shopify's React component library used for building embedded app UIs

## Requirements

### Requirement 1: Store Connection Management

**User Story:** As a florist, I want to connect my Shopify store to Bloom using an API key, so that Bloom can access my product catalog and send me delivery orders.

#### Acceptance Criteria

1. WHEN a florist enters a valid Bloom_API_Key and submits the connection form, THE Shopify_App SHALL validate the key against the Bloom_API, create a Shop_Connection record, and display a success confirmation
2. WHEN a florist enters an invalid or empty Bloom_API_Key, THE Shopify_App SHALL display a descriptive error message and preserve the form state
3. WHEN a Shop_Connection already exists for the current store, THE Shopify_App SHALL display the current connection status including the linked florist name and last sync timestamp
4. WHEN a florist disconnects from Bloom, THE Shopify_App SHALL remove the Shop_Connection record, notify the Bloom_API of the disconnection, and reset the UI to the unconnected state
5. IF the Bloom_API is unreachable during connection validation, THEN THE Shopify_App SHALL display a network error message and allow the florist to retry

### Requirement 2: Product Catalog Synchronization

**User Story:** As a florist, I want my Shopify products to sync to Bloom, so that Bloom knows which products I offer and their current pricing.

#### Acceptance Criteria

1. WHEN a florist triggers a manual sync from the products page, THE Shopify_App SHALL fetch all active products from the Shopify GraphQL API and send them to the Bloom_API via the product sync endpoint
2. WHEN a Product_Sync completes successfully, THE Shopify_App SHALL display the count of synced products and update the last sync timestamp on the Shop_Connection record
3. WHEN a Product_Sync encounters a partial failure, THE Shopify_App SHALL report which products failed to sync and which succeeded
4. WHILE no Shop_Connection exists, THE Shopify_App SHALL disable the sync button and display a message directing the florist to connect first
5. WHEN products are fetched from Shopify, THE Shopify_App SHALL include the product ID, variant ID, title, price, image URL, and inventory quantity for each product

### Requirement 3: Tier Mapping

**User Story:** As a florist, I want to map my Shopify products to Bloom subscription tiers, so that Bloom knows which product to use for each tier when generating delivery orders.

#### Acceptance Criteria

1. WHEN a florist views the products page with a valid Shop_Connection, THE Shopify_App SHALL display all synced products alongside the three Bloom tiers (ESSENTIAL, SIGNATURE, STATEMENT)
2. WHEN a florist selects a product for a tier, THE Shopify_App SHALL send the mapping to the Bloom_API and display a confirmation
3. WHEN a florist changes a tier mapping, THE Shopify_App SHALL update the mapping on the Bloom_API and reflect the change in the UI
4. WHEN a tier has no mapped product, THE Shopify_App SHALL display the tier as unmapped with a prompt to select a product
5. WHEN a florist attempts to map the same product to multiple tiers, THE Shopify_App SHALL allow the mapping (products can serve multiple tiers)

### Requirement 4: Webhook Processing

**User Story:** As a platform operator, I want the Shopify app to process webhooks for product changes and app lifecycle events, so that Bloom stays in sync with the florist's Shopify store.

#### Acceptance Criteria

1. WHEN a PRODUCTS_UPDATE webhook is received, THE Webhook_Handler SHALL update the corresponding product data in the Bloom_API with the new title, price, image, and inventory
2. WHEN a PRODUCTS_DELETE webhook is received, THE Webhook_Handler SHALL notify the Bloom_API to remove the product and clear any tier mappings that reference the deleted product
3. WHEN an APP_UNINSTALLED webhook is received, THE Webhook_Handler SHALL remove the Shop_Connection record and notify the Bloom_API that the florist has disconnected
4. IF a webhook payload fails validation, THEN THE Webhook_Handler SHALL log the error with the shop domain and webhook topic and return an HTTP 200 response to prevent Shopify retries
5. THE Webhook_Handler SHALL authenticate all incoming webhooks using the Shopify HMAC signature verification provided by the shopify-app-remix library

### Requirement 5: Florist Onboarding Flow

**User Story:** As a florist, I want a guided onboarding experience, so that I can set up my Bloom connection step by step without confusion.

#### Acceptance Criteria

1. WHEN a florist opens the app for the first time (no Shop_Connection exists), THE Shopify_App SHALL display the onboarding flow with three steps: Link Store, Link Products, Turn on Deliveries
2. WHEN the florist completes the Link Store step (valid API key connected), THE Shopify_App SHALL mark step one as complete and enable step two
3. WHEN the florist completes the Link Products step (at least one tier has a mapped product), THE Shopify_App SHALL mark step two as complete and enable step three
4. WHEN the florist completes the Turn on Deliveries step, THE Shopify_App SHALL notify the Bloom_API to set the florist status to READY and display a success state
5. WHILE a prerequisite step is incomplete, THE Shopify_App SHALL disable subsequent steps and display a message indicating the prerequisite
6. WHEN all three onboarding steps are complete, THE Shopify_App SHALL display the main dashboard view instead of the onboarding flow

### Requirement 6: Dashboard Home Page

**User Story:** As a connected florist, I want to see an overview of my Bloom connection status, so that I can quickly understand my store's integration health.

#### Acceptance Criteria

1. WHEN a connected florist opens the app, THE Shopify_App SHALL display the connection status, number of synced products, number of mapped tiers, and last sync timestamp
2. WHEN any tier is unmapped, THE Shopify_App SHALL display a warning banner with a link to the products page
3. WHEN the florist has upcoming deliveries, THE Shopify_App SHALL display the count of pending deliveries
4. THE Shopify_App SHALL provide navigation links to the Products page and Settings page from the dashboard

### Requirement 7: Bloom API Integration

**User Story:** As a developer, I want the Shopify app to communicate reliably with the Bloom API, so that data stays consistent between Shopify and Bloom.

#### Acceptance Criteria

1. THE Shopify_App SHALL authenticate all requests to the Bloom_API using the stored Bloom_API_Key in the X-API-Key header
2. WHEN the Bloom_API returns an error response, THE Shopify_App SHALL parse the error envelope and display the error message to the florist
3. WHEN the Bloom_API is unreachable, THE Shopify_App SHALL display a connectivity error and allow the florist to retry the operation
4. THE Shopify_App SHALL serialize product data to the Bloom_API using the BloomProduct schema (shopify_product_id, title, price, image_url, status)
5. THE Shopify_App SHALL deserialize Bloom_API responses and validate the response structure before rendering data in the UI
