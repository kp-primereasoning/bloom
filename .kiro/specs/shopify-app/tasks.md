# Implementation Plan: Shopify App

## Overview

Build out the complete Bloom Shopify embedded app on the existing Remix scaffold. Work proceeds bottom-up: data layer and API client first, then routes and UI, then webhooks, and finally the onboarding flow that ties everything together.

## Tasks

- [x] 1. Extend Prisma schema and Bloom API client
  - [x] 1.1 Update Prisma ShopConnection model with new fields (bloomApiKey, floristName, syncedCount) and run migration
    - Update `prisma/schema.prisma` with the extended ShopConnection model from the design
    - Run `npx prisma migrate dev` to generate and apply the migration
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Implement the full Bloom API client in `bloom-api.server.ts`
    - Replace the existing stub with typed methods: validateApiKey, syncProducts, getFloristProducts, getTierMappings, setTierMapping, removeTierMapping, setFloristReady, getFloristDashboard, notifyProductUpdate, notifyProductDeletion, notifyDisconnection, getConnectionStatus
    - Implement BloomApiError class for consistent error handling
    - All methods use X-API-Key header authentication and parse Bloom error envelope responses
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.3 Implement product transformation utility
    - Create `app/services/product-transform.server.ts` with a function to convert Shopify GraphQL product responses into BloomProduct objects
    - Handle missing images, extract first variant price and ID
    - _Requirements: 2.5, 7.4_

  - [x] 1.4 Implement onboarding state derivation function
    - Create `app/services/onboarding.server.ts` with the `deriveOnboardingState` pure function
    - Takes ShopConnection, TierMapping[], and florist status as inputs
    - Returns OnboardingState with step ordering invariant
    - _Requirements: 5.2, 5.3, 5.5, 5.6_

  - [x] 1.5 Write property tests for Bloom API client, product transformation, and onboarding state
    - Install fast-check as dev dependency
    - **Property 2: Invalid API key rejection** — generate empty/whitespace strings, verify rejection
    - **Property 3: Product transformation completeness** — generate random Shopify product shapes, verify all BloomProduct fields present
    - **Property 5: Onboarding state derivation invariant** — generate random connection/mappings/status combos, verify step ordering and isComplete
    - **Property 9: API key header authentication** — generate random API keys, verify X-API-Key header
    - **Property 10: API response deserialization** — generate random error envelopes and success responses, verify parsing
    - **Validates: Requirements 1.2, 2.5, 5.2, 5.3, 5.5, 5.6, 7.1, 7.2, 7.4, 7.5**

- [x] 2. Checkpoint - Ensure data layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Build Settings page (connection management)
  - [x] 3.1 Implement Settings page loader and actions
    - Update `app/routes/app.settings.tsx` loader to query ShopConnection from Prisma and return connection status
    - Implement "connect" action: validate API key via Bloom API client, create ShopConnection in Prisma
    - Implement "disconnect" action: delete ShopConnection from Prisma, call notifyDisconnection on Bloom API
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Build Settings page UI with Polaris
    - Show ConnectionForm when not connected (API key input + connect button)
    - Show ConnectionStatus when connected (florist name, shop domain, last sync, disconnect button)
    - Display success/error banners from action results
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 Write property test for connection round-trip
    - **Property 1: Connection round-trip** — generate random shop domains + API keys, verify connect then disconnect leaves no ShopConnection
    - **Validates: Requirements 1.1, 1.4**

- [x] 4. Build Products page (sync + tier mapping)
  - [x] 4.1 Implement Products page loader and actions
    - Update `app/routes/app.products.tsx` loader to fetch Shopify products via GraphQL, load tier mappings from Bloom API, and check ShopConnection status
    - Implement "sync" action: fetch products from Shopify, transform with product-transform utility, send to Bloom API syncProducts, update ShopConnection syncedAt/syncedCount
    - Implement "map-tier" action: call setTierMapping on Bloom API with selected tier and product ID
    - Implement "unmap-tier" action: call removeTierMapping on Bloom API
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Build Products page UI with Polaris
    - Show product list with Shopify product data (thumbnail, title, price, status)
    - Show three TierMappingCard components (ESSENTIAL, SIGNATURE, STATEMENT) with product selector dropdowns
    - Show sync button with last sync timestamp; disable when no connection
    - Display sync results (count synced, any failures)
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.4_

  - [x] 4.3 Write property tests for sync result integrity and tier mapping idempotence
    - **Property 4: Sync result integrity** — generate random product lists, verify synced + failed == total and syncedCount updated
    - **Property 6: Tier mapping idempotence** — generate random tier + product pairs, verify double-set produces same state
    - **Validates: Requirements 2.2, 2.3, 3.3**

- [x] 5. Build Webhook handler
  - [x] 5.1 Implement webhook processing logic
    - Update `app/routes/webhooks.tsx` to handle PRODUCTS_UPDATE, PRODUCTS_DELETE, and APP_UNINSTALLED topics
    - Look up ShopConnection for the shop domain to get API key
    - For PRODUCTS_UPDATE: transform payload and call notifyProductUpdate on Bloom API
    - For PRODUCTS_DELETE: call notifyProductDeletion on Bloom API
    - For APP_UNINSTALLED: delete ShopConnection from Prisma and call notifyDisconnection
    - Wrap all processing in try/catch, always return 200
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Write property tests for webhook handling
    - **Property 7: Webhook product update transformation** — generate random webhook payloads, verify transformed data matches payload values
    - **Property 8: Invalid webhook graceful handling** — generate malformed payloads, verify 200 response and no unhandled exceptions
    - **Validates: Requirements 4.1, 4.4**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Build Dashboard home page and onboarding flow
  - [x] 7.1 Implement Dashboard home page loader
    - Update `app/routes/app._index.tsx` loader to query ShopConnection, fetch dashboard data from Bloom API (getFloristDashboard), fetch tier mappings, and derive onboarding state
    - Return connection status, synced product count, mapped tier count, pending delivery count, onboarding state
    - _Requirements: 5.1, 5.6, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Build Dashboard UI with onboarding flow
    - When onboarding is incomplete: show OnboardingBanner with three step cards (Link Store, Link Products, Turn on Deliveries) with completion indicators and prerequisite messaging
    - When onboarding is complete: show DashboardCards with connection status, synced products count, mapped tiers, pending deliveries, and warning banner if any tier is unmapped
    - Implement "activate-deliveries" action that calls setFloristReady on Bloom API
    - Navigation links to Products and Settings pages
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4_

- [x] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property tests are required
- Each task references specific requirements for traceability
- The Shopify app scaffold (OAuth, Prisma sessions, Polaris, Remix routes) is already working
- All Bloom API endpoints referenced in the client need to be built on the FastAPI backend — this spec covers the Shopify app side only
- Property tests use fast-check with minimum 100 iterations per property
