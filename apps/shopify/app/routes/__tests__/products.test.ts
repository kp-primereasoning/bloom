import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.BLOOM_API_URL = "http://test-bloom.local";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a valid BloomProduct object with random field values. */
const bloomProductArb = fc.record({
  shopify_product_id: fc.string({ minLength: 1, maxLength: 60 }),
  shopify_variant_id: fc.string({ minLength: 1, maxLength: 60 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  price: fc
    .tuple(fc.nat({ max: 9999 }), fc.nat({ max: 99 }))
    .map(([dollars, cents]) => `${dollars}.${String(cents).padStart(2, "0")}`),
  image_url: fc.option(fc.webUrl(), { nil: null }),
  inventory_quantity: fc.nat({ max: 10000 }),
  status: fc.constantFrom("ACTIVE", "DRAFT", "ARCHIVED"),
});

/** Generates one of the three Bloom tier values. */
const tierArb = fc.constantFrom("ESSENTIAL" as const, "SIGNATURE" as const, "STATEMENT" as const);

// ---------------------------------------------------------------------------
// Property 4: Sync result integrity
// Feature: shopify-app, Property 4: Sync result integrity
// **Validates: Requirements 2.2, 2.3**
// ---------------------------------------------------------------------------

describe("Property 4: Sync result integrity", () => {
  it("synced + failed == total for any product list", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(bloomProductArb, { minLength: 0, maxLength: 20 }),
        fc.integer({ min: 0, max: 20 }),
        async (products, failCount) => {
          const actualFailed = Math.min(failCount, products.length);
          const actualSynced = products.length - actualFailed;

          globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(
              JSON.stringify({
                success: actualFailed === 0,
                synced: actualSynced,
                failed: actualFailed,
                errors: Array(actualFailed).fill("sync error"),
              }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );

          const { syncProducts } = await import(
            "../../services/bloom-api.server"
          );
          const result = await syncProducts(
            "test-key",
            "test.myshopify.com",
            products,
          );

          expect(result.synced + result.failed).toBe(products.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Tier mapping idempotence
// Feature: shopify-app, Property 6: Tier mapping idempotence
// **Validates: Requirements 3.3**
// ---------------------------------------------------------------------------

describe("Property 6: Tier mapping idempotence", () => {
  it("setting the same tier mapping twice produces the same state", async () => {
    await fc.assert(
      fc.asyncProperty(
        tierArb,
        fc.string({ minLength: 1, maxLength: 60 }),
        async (tier, productId) => {
          const mockMapping = {
            tier,
            shopify_product_id: productId,
            product_title: "Test Product",
            product_price: "29.99",
            mapped_at: new Date().toISOString(),
          };

          // Return a fresh Response for each call so the body isn't consumed
          globalThis.fetch = vi.fn().mockImplementation(() =>
            Promise.resolve(
              new Response(JSON.stringify(mockMapping), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }),
            ),
          );

          const { setTierMapping } = await import(
            "../../services/bloom-api.server"
          );

          const first = await setTierMapping("test-key", tier, productId);
          const second = await setTierMapping("test-key", tier, productId);

          expect(first.tier).toBe(second.tier);
          expect(first.shopify_product_id).toBe(second.shopify_product_id);
          expect(first.tier).toBe(tier);
          expect(first.shopify_product_id).toBe(productId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
