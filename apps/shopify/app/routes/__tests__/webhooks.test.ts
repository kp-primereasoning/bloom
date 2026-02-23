import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { transformWebhookProduct } from "../webhooks";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a valid Shopify REST webhook product payload. */
const webhookPayloadArb = fc.record({
  id: fc.nat({ max: 999999999 }),
  title: fc.string({ minLength: 0, maxLength: 100 }),
  status: fc.constantFrom("active", "draft", "archived"),
  image: fc.option(fc.record({ src: fc.webUrl() }), { nil: null }),
  images: fc.array(fc.record({ src: fc.webUrl() }), {
    minLength: 0,
    maxLength: 3,
  }),
  variants: fc.array(
    fc.record({
      id: fc.nat({ max: 999999999 }),
      price: fc
        .tuple(fc.nat({ max: 9999 }), fc.nat({ max: 99 }))
        .map(([d, c]) => `${d}.${String(c).padStart(2, "0")}`),
      inventory_quantity: fc.nat({ max: 10000 }),
    }),
    { minLength: 0, maxLength: 5 },
  ),
});

// ---------------------------------------------------------------------------
// Property 7: Webhook product update transformation
// Feature: shopify-app, Property 7: Webhook product update transformation
// **Validates: Requirements 4.1**
// ---------------------------------------------------------------------------

describe("Property 7: Webhook product update transformation", () => {
  it("transformed data matches webhook payload values", () => {
    fc.assert(
      fc.property(webhookPayloadArb, (payload) => {
        const result = transformWebhookProduct(payload);

        // Product ID matches
        expect(result.shopify_product_id).toBe(String(payload.id));

        // Title matches
        expect(result.title).toBe(payload.title);

        // Status is uppercased
        expect(result.status).toBe(payload.status.toUpperCase());

        // Variant data
        if (payload.variants.length > 0) {
          expect(result.shopify_variant_id).toBe(
            String(payload.variants[0].id),
          );
          expect(result.price).toBe(payload.variants[0].price);
          expect(result.inventory_quantity).toBe(
            payload.variants[0].inventory_quantity,
          );
        } else {
          expect(result.shopify_variant_id).toBe("");
          expect(result.price).toBe("0.00");
          expect(result.inventory_quantity).toBe(0);
        }

        // Image URL — prefer payload.image.src, fall back to images[0].src
        if (payload.image?.src) {
          expect(result.image_url).toBe(payload.image.src);
        } else if (payload.images.length > 0) {
          expect(result.image_url).toBe(payload.images[0].src);
        } else {
          expect(result.image_url).toBeNull();
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Invalid webhook graceful handling
// Feature: shopify-app, Property 8: Invalid webhook graceful handling
// **Validates: Requirements 4.4**
// ---------------------------------------------------------------------------

describe("Property 8: Invalid webhook graceful handling", () => {
  it("does not throw for any malformed payload", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
          fc.constant({ id: null }),
          fc.record({
            id: fc.anything(),
            title: fc.anything(),
            status: fc.anything(),
            variants: fc.anything(),
            image: fc.anything(),
          }),
        ),
        (payload) => {
          // Should not throw
          expect(() => transformWebhookProduct(payload)).not.toThrow();

          // Result should always have the expected shape
          const result = transformWebhookProduct(payload);
          expect(typeof result.shopify_product_id).toBe("string");
          expect(typeof result.shopify_variant_id).toBe("string");
          expect(typeof result.title).toBe("string");
          expect(typeof result.price).toBe("string");
          expect(typeof result.status).toBe("string");
          expect(typeof result.inventory_quantity).toBe("number");
        },
      ),
      { numRuns: 100 },
    );
  });
});
