/**
 * Transforms Shopify GraphQL product responses into BloomProduct objects.
 * Pure utility — no side effects, no API calls.
 */

import type { BloomProduct } from "./bloom-api.server";

// ---------------------------------------------------------------------------
// Shopify GraphQL product shape
// ---------------------------------------------------------------------------

export interface ShopifyProduct {
  id: string; // e.g. "gid://shopify/Product/123"
  title: string;
  status: string; // "ACTIVE", "DRAFT", "ARCHIVED"
  featuredImage?: {
    url: string;
  } | null;
  variants: {
    nodes: Array<{
      id: string; // e.g. "gid://shopify/ProductVariant/456"
      price: string;
      inventoryQuantity?: number;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Transform functions
// ---------------------------------------------------------------------------

/**
 * Convert a single Shopify GraphQL product into a BloomProduct.
 *
 * Edge cases:
 * - Missing featuredImage → image_url is null
 * - No variants → variant_id = "", price = "0.00", inventory = 0
 * - Missing inventoryQuantity on variant → defaults to 0
 */
export function transformShopifyProduct(product: ShopifyProduct): BloomProduct {
  const firstVariant = product.variants.nodes[0];

  return {
    shopify_product_id: product.id,
    shopify_variant_id: firstVariant?.id ?? "",
    title: product.title,
    price: firstVariant?.price ?? "0.00",
    image_url: product.featuredImage?.url ?? null,
    inventory_quantity: firstVariant?.inventoryQuantity ?? 0,
    status: product.status,
  };
}

/**
 * Convert a list of Shopify GraphQL products into BloomProduct objects.
 */
export function transformShopifyProducts(
  products: ShopifyProduct[],
): BloomProduct[] {
  return products.map(transformShopifyProduct);
}
