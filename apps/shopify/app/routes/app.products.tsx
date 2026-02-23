import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Thumbnail,
  Badge,
  BlockStack,
  EmptyState,
  Banner,
  Button,
  InlineStack,
  Select,
  FormLayout,
} from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";

import { authenticate } from "../shopify.server";
import {
  syncProducts,
  getTierMappings,
  setTierMapping,
  removeTierMapping,
  BloomApiError,
  type BloomTier,
  type TierMapping,
} from "../services/bloom-api.server";
import { transformShopifyProducts } from "../services/product-transform.server";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// GraphQL query — includes inventoryQuantity for sync
// ---------------------------------------------------------------------------

const PRODUCTS_QUERY = `
  query {
    products(first: 50) {
      nodes {
        id
        title
        status
        featuredImage { url }
        variants(first: 1) {
          nodes {
            id
            price
            inventoryQuantity
          }
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Check ShopConnection
  const connection = await prisma.shopConnection.findUnique({
    where: { shop: session.shop },
  });

  // Fetch products from Shopify
  const response = await admin.graphql(PRODUCTS_QUERY);
  const data = await response.json();
  const products = data.data?.products?.nodes || [];

  // Fetch tier mappings from Bloom API if connected
  let tierMappings: TierMapping[] = [];
  if (connection?.bloomApiKey) {
    try {
      tierMappings = await getTierMappings(connection.bloomApiKey);
    } catch {
      // If Bloom API is unreachable, show empty mappings
    }
  }

  return json({
    products,
    tierMappings,
    isConnected: !!connection,
    syncedAt: connection?.syncedAt?.toISOString() ?? null,
    syncedCount: connection?.syncedCount ?? 0,
  });
};

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  const connection = await prisma.shopConnection.findUnique({
    where: { shop: session.shop },
  });

  if (!connection) {
    return json(
      { error: "Not connected to Bloom. Please connect first." },
      { status: 400 },
    );
  }

  // --- Sync products ---
  if (intent === "sync") {
    try {
      const response = await admin.graphql(PRODUCTS_QUERY);
      const data = await response.json();
      const shopifyProducts = data.data?.products?.nodes || [];

      const bloomProducts = transformShopifyProducts(shopifyProducts);
      const result = await syncProducts(
        connection.bloomApiKey,
        session.shop,
        bloomProducts,
      );

      await prisma.shopConnection.update({
        where: { shop: session.shop },
        data: {
          syncedAt: new Date(),
          syncedCount: result.synced,
        },
      });

      return json({
        success: true,
        message: `Synced ${result.synced} products to Bloom.`,
        syncResult: result,
      });
    } catch (error) {
      if (error instanceof BloomApiError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json(
        { error: "Failed to sync products. Please try again." },
        { status: 500 },
      );
    }
  }

  // --- Map tier ---
  if (intent === "map-tier") {
    const tier = formData.get("tier") as BloomTier;
    const productId = formData.get("productId") as string;

    if (!tier || !productId) {
      return json(
        { error: "Tier and product ID are required." },
        { status: 400 },
      );
    }

    try {
      const mapping = await setTierMapping(
        connection.bloomApiKey,
        tier,
        productId,
      );
      return json({ success: true, message: `Mapped ${tier} tier.`, mapping });
    } catch (error) {
      if (error instanceof BloomApiError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json(
        { error: "Failed to set tier mapping." },
        { status: 500 },
      );
    }
  }

  // --- Unmap tier ---
  if (intent === "unmap-tier") {
    const tier = formData.get("tier") as BloomTier;

    if (!tier) {
      return json({ error: "Tier is required." }, { status: 400 });
    }

    try {
      await removeTierMapping(connection.bloomApiKey, tier);
      return json({
        success: true,
        message: `Removed ${tier} tier mapping.`,
      });
    } catch (error) {
      if (error instanceof BloomApiError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json(
        { error: "Failed to remove tier mapping." },
        { status: 500 },
      );
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
};


// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  title: string;
  status: string;
  featuredImage?: { url: string } | null;
  variants: { nodes: { id: string; price: string; inventoryQuantity?: number }[] };
}

export default function Products() {
  const { products, tierMappings, isConnected, syncedAt, syncedCount } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const productOptions = [
    { label: "Select a product...", value: "" },
    ...products.map((p: Product) => ({ label: p.title, value: p.id })),
  ];

  return (
    <Page title="Products" subtitle="Sync products and manage tier mappings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Action result banners */}
            {actionData?.success && (
              <Banner title="Success" tone="success" onDismiss={() => {}}>
                <p>{actionData.message}</p>
              </Banner>
            )}
            {actionData?.error && (
              <Banner title="Error" tone="critical" onDismiss={() => {}}>
                <p>{actionData.error}</p>
              </Banner>
            )}

            {/* Connection warning */}
            {!isConnected && (
              <Banner title="Not connected" tone="warning">
                <p>Connect to Bloom first in Settings to sync products and manage tiers.</p>
              </Banner>
            )}

            {/* Sync section */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Product Sync</Text>
                <InlineStack gap="400" align="start" blockAlign="center">
                  <Form method="post">
                    <input type="hidden" name="intent" value="sync" />
                    <Button
                      submit
                      variant="primary"
                      loading={isSubmitting && navigation.formData?.get("intent") === "sync"}
                      disabled={!isConnected}
                    >
                      Sync Products to Bloom
                    </Button>
                  </Form>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {syncedAt
                      ? `Last synced: ${new Date(syncedAt).toLocaleString()} (${syncedCount} products)`
                      : "Never synced"}
                  </Text>
                </InlineStack>
                {actionData?.syncResult && (
                  <Text as="p" variant="bodyMd">
                    Synced {actionData.syncResult.synced} products
                    {actionData.syncResult.failed > 0 &&
                      `, ${actionData.syncResult.failed} failed`}
                  </Text>
                )}
              </BlockStack>
            </Card>

            {/* Tier mapping cards */}
            {["ESSENTIAL", "SIGNATURE", "STATEMENT"].map((tier) => {
              const mapping = tierMappings.find(
                (m: { tier: string }) => m.tier === tier,
              );
              return (
                <Card key={tier}>
                  <BlockStack gap="300">
                    <Text as="h3" variant="headingMd">
                      {tier} Tier
                    </Text>
                    {mapping ? (
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">
                          {mapping.product_title} — ${mapping.product_price}
                        </Text>
                        <Form method="post">
                          <input type="hidden" name="intent" value="unmap-tier" />
                          <input type="hidden" name="tier" value={tier} />
                          <Button
                            submit
                            tone="critical"
                            size="slim"
                            loading={
                              isSubmitting &&
                              navigation.formData?.get("intent") === "unmap-tier" &&
                              navigation.formData?.get("tier") === tier
                            }
                          >
                            Remove Mapping
                          </Button>
                        </Form>
                      </BlockStack>
                    ) : (
                      <Form method="post">
                        <input type="hidden" name="intent" value="map-tier" />
                        <input type="hidden" name="tier" value={tier} />
                        <FormLayout>
                          <Select
                            label="Select a product"
                            name="productId"
                            options={productOptions}
                            disabled={!isConnected}
                          />
                          <Button
                            submit
                            variant="primary"
                            size="slim"
                            disabled={!isConnected}
                            loading={
                              isSubmitting &&
                              navigation.formData?.get("intent") === "map-tier" &&
                              navigation.formData?.get("tier") === tier
                            }
                          >
                            Map Product
                          </Button>
                        </FormLayout>
                      </Form>
                    )}
                  </BlockStack>
                </Card>
              );
            })}

            {/* Product list */}
            {products.length === 0 ? (
              <Card>
                <EmptyState
                  heading="No products found"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>Add products to your Shopify store to sync them with Bloom.</p>
                </EmptyState>
              </Card>
            ) : (
              <Card padding="0">
                <ResourceList
                  resourceName={{ singular: "product", plural: "products" }}
                  items={products}
                  renderItem={(product: Product) => {
                    const { id, title, status, featuredImage, variants } = product;
                    const price = variants?.nodes?.[0]?.price || "0.00";
                    const media = featuredImage ? (
                      <Thumbnail source={featuredImage.url} alt={title} />
                    ) : (
                      <Thumbnail source="" alt={title} />
                    );

                    return (
                      <ResourceItem
                        id={id}
                        media={media}
                        accessibilityLabel={`View details for ${title}`}
                      >
                        <BlockStack gap="100">
                          <Text variant="bodyMd" fontWeight="bold" as="h3">
                            {title}
                          </Text>
                          <Text variant="bodyMd" as="p">
                            ${price}
                          </Text>
                          <Badge
                            tone={status === "ACTIVE" ? "success" : "attention"}
                          >
                            {status}
                          </Badge>
                        </BlockStack>
                      </ResourceItem>
                    );
                  }}
                />
              </Card>
            )}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
