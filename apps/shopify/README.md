# Bloom Shopify App

Shopify embedded app for florist integration with Bloom platform.

## Overview

This app allows florists to connect their Shopify store to Bloom, enabling:
- Product catalog sync to Bloom platform
- Order fulfillment through existing Shopify workflows
- Webhook-based updates for product changes

## Setup

### Prerequisites

- Node.js 20+
- Shopify Partner account
- Shopify CLI (`npm install -g @shopify/cli`)

### Local Development

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Create app in Shopify Partner Dashboard and add credentials to `.env`

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Generate Prisma client:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```

5. Start development server:
   ```bash
   pnpm dev
   ```

   This uses Shopify CLI which handles tunneling automatically.

### Deployment

Deploy to a Node.js hosting platform (Render, Railway, Fly.io, etc.):

1. Set environment variables in hosting platform
2. Run `pnpm build`
3. Start with `pnpm start`

## Architecture

```
app/
├── routes/
│   ├── app._index.tsx    # Main dashboard
│   ├── app.products.tsx  # Product listing
│   ├── app.settings.tsx  # Bloom connection settings
│   ├── app.tsx           # App layout with nav
│   ├── auth.$.tsx        # OAuth callback handler
│   ├── auth.login/       # Login page
│   └── webhooks.tsx      # Webhook handlers
├── services/
│   └── bloom-api.server.ts  # Bloom API client
├── shopify.server.ts     # Shopify app config
└── root.tsx              # Root layout
```

## Webhooks

The app listens for:
- `APP_UNINSTALLED` - Cleanup when florist removes app
- `PRODUCTS_UPDATE` - Sync product changes to Bloom
- `PRODUCTS_DELETE` - Remove products from Bloom catalog

## Scopes

Required Shopify API scopes:
- `read_products` - Access product catalog
- `read_orders` - Track order fulfillment
- `read_inventory` - Check stock levels
