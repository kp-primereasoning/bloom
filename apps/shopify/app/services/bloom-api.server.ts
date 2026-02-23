/**
 * Bloom API client for syncing data between Shopify and Bloom.
 * All methods authenticate via X-API-Key header and parse Bloom error envelope responses.
 */

const BLOOM_API_URL = process.env.BLOOM_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BloomTier = "ESSENTIAL" | "SIGNATURE" | "STATEMENT";

export interface BloomProduct {
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  price: string;
  image_url: string | null;
  inventory_quantity: number;
  status: string;
}

export interface BloomFloristConnection {
  shop_domain: string;
  florist_id?: string;
  connected_at: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

export interface TierMapping {
  tier: BloomTier;
  shopify_product_id: string;
  product_title: string;
  product_price: string;
  mapped_at: string;
}

export interface FloristDashboardData {
  florist_id: string;
  florist_name: string;
  florist_status: string;
  synced_product_count: number;
  mapped_tiers: TierMapping[];
  pending_delivery_count: number;
  last_sync_at: string | null;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class BloomApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "BloomApiError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface BloomErrorEnvelope {
  error: { code: string; message: string };
}

function isErrorEnvelope(body: unknown): body is BloomErrorEnvelope {
  return (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof (body as BloomErrorEnvelope).error === "object" &&
    (body as BloomErrorEnvelope).error !== null &&
    typeof (body as BloomErrorEnvelope).error.code === "string" &&
    typeof (body as BloomErrorEnvelope).error.message === "string"
  );
}

/**
 * Shared fetch wrapper that handles network errors, JSON parsing, and Bloom
 * error envelope extraction. Returns the parsed JSON body on success.
 */
async function bloomFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BLOOM_API_URL}${path}`, options);
  } catch (err) {
    throw new BloomApiError(
      "NETWORK_ERROR",
      "Unable to reach Bloom. Please try again.",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new BloomApiError(
      "PARSE_ERROR",
      "Unexpected response from Bloom. Please try again.",
      response.status,
    );
  }

  if (!response.ok) {
    if (isErrorEnvelope(body)) {
      throw new BloomApiError(
        body.error.code,
        body.error.message,
        response.status,
      );
    }
    throw new BloomApiError(
      "HTTP_ERROR",
      `Bloom request failed with status ${response.status}`,
      response.status,
    );
  }

  return body as T;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
}

// ---------------------------------------------------------------------------
// Connection management
// ---------------------------------------------------------------------------

export async function validateApiKey(
  apiKey: string,
): Promise<{ valid: boolean; florist_id?: string; florist_name?: string }> {
  return bloomFetch<{ valid: boolean; florist_id?: string; florist_name?: string }>(
    "/api/florists/validate-key",
    {
      method: "POST",
      headers: authHeaders(apiKey),
    },
  );
}

export async function getConnectionStatus(
  shopDomain: string,
): Promise<BloomFloristConnection | null> {
  try {
    return await bloomFetch<BloomFloristConnection>(
      `/api/florists/connection?shop=${encodeURIComponent(shopDomain)}`,
      { method: "GET", headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof BloomApiError && err.statusCode === 404) {
      return null;
    }
    throw err;
  }
}

export async function notifyDisconnection(
  shopDomain: string,
): Promise<boolean> {
  await bloomFetch<{ success: boolean }>("/api/florists/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shop_domain: shopDomain }),
  });
  return true;
}

// ---------------------------------------------------------------------------
// Product sync
// ---------------------------------------------------------------------------

export async function syncProducts(
  apiKey: string,
  shopDomain: string,
  products: BloomProduct[],
): Promise<SyncResult> {
  return bloomFetch<SyncResult>("/api/florists/products/sync", {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ shop_domain: shopDomain, products }),
  });
}

export async function getFloristProducts(
  apiKey: string,
): Promise<BloomProduct[]> {
  return bloomFetch<BloomProduct[]>("/api/florists/products", {
    method: "GET",
    headers: authHeaders(apiKey),
  });
}

// ---------------------------------------------------------------------------
// Tier mapping
// ---------------------------------------------------------------------------

export async function getTierMappings(
  apiKey: string,
): Promise<TierMapping[]> {
  return bloomFetch<TierMapping[]>("/api/florists/tier-mappings", {
    method: "GET",
    headers: authHeaders(apiKey),
  });
}

export async function setTierMapping(
  apiKey: string,
  tier: BloomTier,
  shopifyProductId: string,
): Promise<TierMapping> {
  return bloomFetch<TierMapping>("/api/florists/tier-mappings", {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ tier, shopify_product_id: shopifyProductId }),
  });
}

export async function removeTierMapping(
  apiKey: string,
  tier: BloomTier,
): Promise<boolean> {
  await bloomFetch<{ success: boolean }>(
    `/api/florists/tier-mappings/${tier}`,
    {
      method: "DELETE",
      headers: authHeaders(apiKey),
    },
  );
  return true;
}

// ---------------------------------------------------------------------------
// Florist status
// ---------------------------------------------------------------------------

export async function setFloristReady(apiKey: string): Promise<boolean> {
  await bloomFetch<{ success: boolean }>("/api/florists/status/ready", {
    method: "POST",
    headers: authHeaders(apiKey),
  });
  return true;
}

export async function getFloristDashboard(
  apiKey: string,
): Promise<FloristDashboardData> {
  return bloomFetch<FloristDashboardData>("/api/florists/dashboard", {
    method: "GET",
    headers: authHeaders(apiKey),
  });
}

// ---------------------------------------------------------------------------
// Webhook forwarding
// ---------------------------------------------------------------------------

export async function notifyProductUpdate(
  apiKey: string,
  shopDomain: string,
  product: BloomProduct,
): Promise<boolean> {
  await bloomFetch<{ success: boolean }>("/api/florists/products/update", {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ shop_domain: shopDomain, product }),
  });
  return true;
}

export async function notifyProductDeletion(
  apiKey: string,
  shopDomain: string,
  shopifyProductId: string,
): Promise<boolean> {
  await bloomFetch<{ success: boolean }>("/api/florists/products/delete", {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      shop_domain: shopDomain,
      shopify_product_id: shopifyProductId,
    }),
  });
  return true;
}
