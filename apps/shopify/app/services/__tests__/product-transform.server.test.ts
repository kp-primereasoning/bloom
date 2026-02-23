import { describe, it, expect } from "vitest";
import {
  transformShopifyProduct,
  transformShopifyProducts,
  type ShopifyProduct,
} from "../product-transform.server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    id: "gid://shopify/Product/123",
    title: "Spring Bouquet",
    status: "ACTIVE",
    featuredImage: { url: "https://cdn.shopify.com/image.jpg" },
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/456",
          price: "29.99",
          inventoryQuantity: 10,
        },
      ],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// transformShopifyProduct
// ---------------------------------------------------------------------------

describe("transformShopifyProduct", () => {
  it("transforms a complete product correctly", () => {
    const result = transformShopifyProduct(makeProduct());

    expect(result).toEqual({
      shopify_product_id: "gid://shopify/Product/123",
      shopify_variant_id: "gid://shopify/ProductVariant/456",
      title: "Spring Bouquet",
      price: "29.99",
      image_url: "https://cdn.shopify.com/image.jpg",
      inventory_quantity: 10,
      status: "ACTIVE",
    });
  });

  it("sets image_url to null when featuredImage is null", () => {
    const result = transformShopifyProduct(
      makeProduct({ featuredImage: null }),
    );
    expect(result.image_url).toBeNull();
  });

  it("sets image_url to null when featuredImage is undefined", () => {
    const result = transformShopifyProduct(
      makeProduct({ featuredImage: undefined }),
    );
    expect(result.image_url).toBeNull();
  });

  it("defaults to empty variant_id, '0.00' price, and 0 inventory when no variants", () => {
    const result = transformShopifyProduct(
      makeProduct({ variants: { nodes: [] } }),
    );

    expect(result.shopify_variant_id).toBe("");
    expect(result.price).toBe("0.00");
    expect(result.inventory_quantity).toBe(0);
  });

  it("defaults inventoryQuantity to 0 when missing on variant", () => {
    const result = transformShopifyProduct(
      makeProduct({
        variants: {
          nodes: [{ id: "gid://shopify/ProductVariant/789", price: "15.00" }],
        },
      }),
    );

    expect(result.inventory_quantity).toBe(0);
    expect(result.shopify_variant_id).toBe("gid://shopify/ProductVariant/789");
    expect(result.price).toBe("15.00");
  });

  it("uses the first variant when multiple variants exist", () => {
    const result = transformShopifyProduct(
      makeProduct({
        variants: {
          nodes: [
            { id: "gid://shopify/ProductVariant/1", price: "10.00", inventoryQuantity: 5 },
            { id: "gid://shopify/ProductVariant/2", price: "20.00", inventoryQuantity: 8 },
          ],
        },
      }),
    );

    expect(result.shopify_variant_id).toBe("gid://shopify/ProductVariant/1");
    expect(result.price).toBe("10.00");
    expect(result.inventory_quantity).toBe(5);
  });

  it("preserves DRAFT status", () => {
    const result = transformShopifyProduct(makeProduct({ status: "DRAFT" }));
    expect(result.status).toBe("DRAFT");
  });

  it("preserves ARCHIVED status", () => {
    const result = transformShopifyProduct(makeProduct({ status: "ARCHIVED" }));
    expect(result.status).toBe("ARCHIVED");
  });
});

// ---------------------------------------------------------------------------
// transformShopifyProducts (batch)
// ---------------------------------------------------------------------------

describe("transformShopifyProducts", () => {
  it("returns an empty array for empty input", () => {
    expect(transformShopifyProducts([])).toEqual([]);
  });

  it("transforms multiple products", () => {
    const products = [
      makeProduct({ id: "gid://shopify/Product/1", title: "Rose Bundle" }),
      makeProduct({ id: "gid://shopify/Product/2", title: "Tulip Set" }),
    ];

    const results = transformShopifyProducts(products);

    expect(results).toHaveLength(2);
    expect(results[0].shopify_product_id).toBe("gid://shopify/Product/1");
    expect(results[0].title).toBe("Rose Bundle");
    expect(results[1].shopify_product_id).toBe("gid://shopify/Product/2");
    expect(results[1].title).toBe("Tulip Set");
  });
});


// ---------------------------------------------------------------------------
// Property-Based Tests (fast-check)
// ---------------------------------------------------------------------------

import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a random ShopifyProduct with arbitrary field values. */
const shopifyProductArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 60 }),
  title: fc.string({ minLength: 0, maxLength: 100 }),
  status: fc.constantFrom("ACTIVE", "DRAFT", "ARCHIVED"),
  featuredImage: fc.option(
    fc.record({ url: fc.webUrl() }),
    { nil: null },
  ),
  variants: fc.record({
    nodes: fc.array(
      fc.record({
        id: fc.string({ minLength: 1, maxLength: 60 }),
        price: fc
          .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."), {
            minLength: 1,
            maxLength: 10,
          })
          .map((chars) => chars.join("")),
        inventoryQuantity: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 5 },
    ),
  }),
}) as fc.Arbitrary<ShopifyProduct>;

// ---------------------------------------------------------------------------
// Property 3: Product transformation completeness
// Feature: shopify-app, Property 3: Product transformation completeness
// Validates: Requirements 2.5, 7.4
// ---------------------------------------------------------------------------

describe("Property 3: Product transformation completeness", () => {
  it("always produces a BloomProduct with all required fields present", () => {
    fc.assert(
      fc.property(shopifyProductArb, (product) => {
        const result = transformShopifyProduct(product);

        // shopify_product_id is always a string (non-null)
        expect(typeof result.shopify_product_id).toBe("string");
        expect(result.shopify_product_id).toBe(product.id);

        // shopify_variant_id is always a string (non-null)
        expect(typeof result.shopify_variant_id).toBe("string");

        // title is always a string (non-null)
        expect(typeof result.title).toBe("string");
        expect(result.title).toBe(product.title);

        // price is always a string (non-null)
        expect(typeof result.price).toBe("string");

        // status is always a string (non-null)
        expect(typeof result.status).toBe("string");
        expect(result.status).toBe(product.status);

        // image_url is present (string or null)
        expect("image_url" in result).toBe(true);
        if (product.featuredImage?.url) {
          expect(result.image_url).toBe(product.featuredImage.url);
        } else {
          expect(result.image_url).toBeNull();
        }

        // inventory_quantity is always a number
        expect(typeof result.inventory_quantity).toBe("number");
      }),
      { numRuns: 100 },
    );
  });

  it("batch transformation preserves length and individual completeness", () => {
    fc.assert(
      fc.property(fc.array(shopifyProductArb, { minLength: 0, maxLength: 20 }), (products) => {
        const results = transformShopifyProducts(products);

        expect(results).toHaveLength(products.length);

        for (const result of results) {
          expect(typeof result.shopify_product_id).toBe("string");
          expect(typeof result.shopify_variant_id).toBe("string");
          expect(typeof result.title).toBe("string");
          expect(typeof result.price).toBe("string");
          expect(typeof result.status).toBe("string");
          expect("image_url" in result).toBe(true);
          expect(typeof result.inventory_quantity).toBe("number");
        }
      }),
      { numRuns: 100 },
    );
  });
});
