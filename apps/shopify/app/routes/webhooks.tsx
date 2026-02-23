import type { ActionFunctionArgs } from "@remix-run/node";
import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";
import {
  notifyProductUpdate,
  notifyProductDeletion,
  notifyDisconnection,
} from "../services/bloom-api.server";
import type { BloomProduct } from "../services/bloom-api.server";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Webhook payload transformation
// ---------------------------------------------------------------------------

/**
 * Transform a Shopify REST webhook product payload into a BloomProduct.
 *
 * Shopify webhook payloads use the REST API shape which differs from the
 * GraphQL shape used in manual sync:
 * - `id` is a numeric ID (not a GID string)
 * - `variants` is a flat array (not `variants.nodes`)
 * - Image is at `image.src` or `images[0].src` (not `featuredImage.url`)
 * - `status` is lowercase (e.g. "active") rather than uppercase
 */
export function transformWebhookProduct(payload: any): BloomProduct {
  const safe = payload ?? {};
  const variant = Array.isArray(safe.variants) ? safe.variants[0] : undefined;
  const rawTitle = typeof safe.title === "string" ? safe.title : "";
  const rawStatus = typeof safe.status === "string" ? safe.status : "active";
  const rawPrice =
    variant && typeof variant.price === "string" ? variant.price : "0.00";
  const rawInvQty =
    variant && typeof variant.inventory_quantity === "number"
      ? variant.inventory_quantity
      : 0;
  return {
    shopify_product_id: String(safe.id ?? ""),
    shopify_variant_id: variant ? String(variant.id ?? "") : "",
    title: rawTitle,
    price: rawPrice,
    image_url: safe.image?.src || safe.images?.[0]?.src || null,
    inventory_quantity: rawInvQty,
    status: rawStatus.toUpperCase(),
  };
}

// ---------------------------------------------------------------------------
// Webhook action
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook from ${shop}`);

  try {
    // Look up ShopConnection for the shop domain to get API key
    const connection = await prisma.shopConnection.findUnique({
      where: { shop },
    });

    switch (topic) {
      case "PRODUCTS_UPDATE": {
        if (connection?.bloomApiKey && payload) {
          const product = transformWebhookProduct(payload);
          await notifyProductUpdate(connection.bloomApiKey, shop, product);
        }
        break;
      }

      case "PRODUCTS_DELETE": {
        if (connection?.bloomApiKey && payload) {
          const productId = String((payload as any).id);
          await notifyProductDeletion(connection.bloomApiKey, shop, productId);
        }
        break;
      }

      case "APP_UNINSTALLED": {
        if (connection) {
          // Remove the ShopConnection record first
          await prisma.shopConnection.delete({ where: { shop } });
          // Best-effort notification to Bloom API
          try {
            await notifyDisconnection(shop);
          } catch {
            console.error(
              `Failed to notify Bloom of disconnection for ${shop}`,
            );
          }
        }
        break;
      }

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }
  } catch (error) {
    console.error(`Webhook processing failed: ${topic} from ${shop}`, error);
    // Always return 200 to prevent Shopify retries
  }

  return new Response(null, { status: 200 });
};
