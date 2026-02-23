import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  Banner,
  Button,
  InlineStack,
  Badge,
} from "@shopify/polaris";
import { PrismaClient } from "@prisma/client";

import { authenticate } from "../shopify.server";
import {
  getFloristDashboard,
  getTierMappings,
  setFloristReady,
  BloomApiError,
  type TierMapping,
  type FloristDashboardData,
} from "../services/bloom-api.server";
import { deriveOnboardingState, type OnboardingState } from "../services/onboarding.server";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const connection = await prisma.shopConnection.findUnique({
    where: { shop: session.shop },
  });

  let dashboard: FloristDashboardData | null = null;
  let tierMappings: TierMapping[] = [];

  if (connection?.bloomApiKey) {
    try {
      dashboard = await getFloristDashboard(connection.bloomApiKey);
    } catch {
      // Bloom API unreachable — show degraded state
    }

    try {
      tierMappings = await getTierMappings(connection.bloomApiKey);
    } catch {
      // Bloom API unreachable
    }
  }

  const onboardingState: OnboardingState = deriveOnboardingState(
    connection,
    tierMappings,
    dashboard?.florist_status ?? null,
  );

  return json({
    shop: session.shop,
    isConnected: !!connection,
    connection: connection
      ? {
          floristName: connection.floristName,
          syncedAt: connection.syncedAt?.toISOString() ?? null,
          syncedCount: connection.syncedCount,
        }
      : null,
    dashboard,
    tierMappings,
    onboardingState,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "activate-deliveries") {
    const connection = await prisma.shopConnection.findUnique({
      where: { shop: session.shop },
    });

    if (!connection?.bloomApiKey) {
      return json({ error: "Not connected to Bloom." }, { status: 400 });
    }

    try {
      await setFloristReady(connection.bloomApiKey);
      return json({ success: true, message: "Deliveries activated! You're all set." });
    } catch (error) {
      if (error instanceof BloomApiError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json({ error: "Failed to activate deliveries." }, { status: 500 });
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function Index() {
  const { connection, dashboard, tierMappings, onboardingState } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as
    | { success: true; message: string }
    | { error: string }
    | undefined;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const mappedTierCount = tierMappings.length;
  const hasUnmappedTiers = mappedTierCount < 3;

  return (
    <Page title="Bloom Florist Connect">
      <BlockStack gap="500">
        {/* Action result banners */}
        {actionData && "success" in actionData && (
          <Banner title="Success" tone="success">
            <p>{actionData.message}</p>
          </Banner>
        )}
        {actionData && "error" in actionData && (
          <Banner title="Error" tone="critical">
            <p>{actionData.error}</p>
          </Banner>
        )}

        {!onboardingState.isComplete ? (
          /* ONBOARDING FLOW */
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">
                      Get Started with Bloom
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Complete these three steps to start receiving delivery orders from Bloom
                      properties.
                    </Text>
                  </BlockStack>
                </Card>

                {/* Step 1: Link Store */}
                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="start" blockAlign="center">
                      <Badge tone={onboardingState.step1_linkStore ? "success" : "attention"}>
                        {onboardingState.step1_linkStore ? "Complete" : "Step 1"}
                      </Badge>
                      <Text as="h3" variant="headingMd">
                        Link Your Store
                      </Text>
                    </InlineStack>
                    {onboardingState.step1_linkStore ? (
                      <Text as="p" variant="bodyMd" tone="success">
                        Connected as {connection?.floristName || "florist"}
                      </Text>
                    ) : (
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">
                          Enter your Bloom API key to connect your Shopify store.
                        </Text>
                        <Button url="/app/settings" variant="primary">
                          Connect to Bloom
                        </Button>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {/* Step 2: Link Products */}
                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="start" blockAlign="center">
                      <Badge tone={onboardingState.step2_linkProducts ? "success" : "attention"}>
                        {onboardingState.step2_linkProducts ? "Complete" : "Step 2"}
                      </Badge>
                      <Text as="h3" variant="headingMd">
                        Link Products
                      </Text>
                    </InlineStack>
                    {!onboardingState.step1_linkStore ? (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Complete Step 1 first to unlock this step.
                      </Text>
                    ) : onboardingState.step2_linkProducts ? (
                      <Text as="p" variant="bodyMd" tone="success">
                        {mappedTierCount} tier(s) mapped
                      </Text>
                    ) : (
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">
                          Sync your products and map at least one to a Bloom tier.
                        </Text>
                        <Button url="/app/products" variant="primary">
                          Go to Products
                        </Button>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {/* Step 3: Turn on Deliveries */}
                <Card>
                  <BlockStack gap="300">
                    <InlineStack gap="200" align="start" blockAlign="center">
                      <Badge tone={onboardingState.step3_deliveries ? "success" : "attention"}>
                        {onboardingState.step3_deliveries ? "Complete" : "Step 3"}
                      </Badge>
                      <Text as="h3" variant="headingMd">
                        Turn on Deliveries
                      </Text>
                    </InlineStack>
                    {!onboardingState.step2_linkProducts ? (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Complete Step 2 first to unlock this step.
                      </Text>
                    ) : onboardingState.step3_deliveries ? (
                      <Text as="p" variant="bodyMd" tone="success">
                        Deliveries are active!
                      </Text>
                    ) : (
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd">
                          Activate deliveries to start receiving orders from Bloom properties.
                        </Text>
                        <Form method="post">
                          <input type="hidden" name="intent" value="activate-deliveries" />
                          <Button submit variant="primary" loading={isSubmitting}>
                            Activate Deliveries
                          </Button>
                        </Form>
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>
          </Layout>
        ) : (
          /* DASHBOARD VIEW */
          <Layout>
            <Layout.Section>
              <BlockStack gap="400">
                {hasUnmappedTiers && (
                  <Banner
                    title="Unmapped tiers"
                    tone="warning"
                    action={{ content: "Map Products", url: "/app/products" }}
                  >
                    <p>
                      You have {3 - mappedTierCount} unmapped tier(s). Map products to all three
                      tiers for the best experience.
                    </p>
                  </Banner>
                )}

                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">
                      Dashboard
                    </Text>
                    <InlineStack gap="400">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Connection
                        </Text>
                        <Badge tone="success">Connected</Badge>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Synced Products
                        </Text>
                        <Text as="p" variant="headingMd">
                          {connection?.syncedCount ?? 0}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Mapped Tiers
                        </Text>
                        <Text as="p" variant="headingMd">
                          {mappedTierCount}/3
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Pending Deliveries
                        </Text>
                        <Text as="p" variant="headingMd">
                          {dashboard?.pending_delivery_count ?? 0}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                    {connection?.syncedAt && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        Last sync: {new Date(connection.syncedAt).toLocaleString()}
                      </Text>
                    )}
                  </BlockStack>
                </Card>
              </BlockStack>
            </Layout.Section>

            <Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Quick Links
                  </Text>
                  <Button url="/app/products" fullWidth>
                    Products &amp; Tiers
                  </Button>
                  <Button url="/app/settings" fullWidth>
                    Settings
                  </Button>
                </BlockStack>
              </Card>
            </Layout.Section>
          </Layout>
        )}
      </BlockStack>
    </Page>
  );
}
