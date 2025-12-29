---
inclusion: always
---

# Bloom Product Context

## Core Business Model
Bloom is a **property-based floral subscription orchestration platform**. Key principles:

- **Bloom does NOT sell flowers or manage inventory**
- **Shopify is the system of record** for all products and pricing
- **One delivery cadence per property** (no per-resident customization)
- **Bloom controls florist assignment** (residents cannot choose florists)

## User Roles & Responsibilities

### Residents
- Subscribe/unsubscribe to property's floral program
- Skip deliveries or upgrade individual orders
- Manage delivery preferences within property constraints

### Property Managers  
- View participation metrics and resident engagement
- Redeem property-level rewards and incentives
- **Cannot** modify delivery schedules or florist assignments

### Florists
- Connect existing Shopify store to Bloom platform
- Fulfill deliveries based on Bloom-generated orders
- **Cannot** modify pricing or product availability through Bloom

### Bloom Admin
- Activate new properties and configure delivery cadence
- Assign florists to properties based on capacity and geography
- Manage supply-demand balance across the platform

## Development Priorities (MLP)

**Always prioritize:**
1. **Activation over automation** - manual processes are acceptable if they enable faster go-to-market
2. **Clarity over flexibility** - simple, predictable workflows over customizable options  
3. **Premium UX over feature depth** - polished core experience over extensive feature set

**Success metric:** Property goes live with real subscriptions and fulfilled deliveries

## Architecture Constraints

**Bloom is NOT:**
- A marketplace (no florist discovery or selection)
- A catalog builder (Shopify handles products)
- An inventory system (florists manage their own stock)
- A payments platform (integrate with existing solutions)

**Integration Requirements:**
- All product data must sync from Shopify APIs
- Maintain clear separation between Bloom orchestration and florist fulfillment
- Design for property-level configuration, not individual customization