import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
  Text,
  Banner,
  Box,
  Badge,
} from "@shopify/polaris";
import { useState } from "react";
import { PrismaClient } from "@prisma/client";

import { authenticate } from "../shopify.server";
import {
  validateApiKey,
  notifyDisconnection,
  BloomApiError,
} from "../services/bloom-api.server";

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const connection = await prisma.shopConnection.findUnique({
    where: { shop: session.shop },
  });

  return json({
    shop: session.shop,
    connection: connection
      ? {
          floristId: connection.floristId,
          floristName: connection.floristName,
          syncedAt: connection.syncedAt?.toISOString() ?? null,
          syncedCount: connection.syncedCount,
          createdAt: connection.createdAt.toISOString(),
        }
      : null,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "connect") {
    const bloomApiKey = formData.get("bloomApiKey") as string;
    if (!bloomApiKey || !bloomApiKey.trim()) {
      return json({ error: "Bloom API key is required" }, { status: 400 });
    }

    try {
      const result = await validateApiKey(bloomApiKey);
      if (!result.valid) {
        return json({ error: "Invalid API key" }, { status: 400 });
      }

      await prisma.shopConnection.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          bloomApiKey,
          floristId: result.florist_id ?? null,
          floristName: result.florist_name ?? null,
        },
        update: {
          bloomApiKey,
          floristId: result.florist_id ?? null,
          floristName: result.florist_name ?? null,
        },
      });

      return json({ success: true, message: "Connected to Bloom successfully!" });
    } catch (error) {
      if (error instanceof BloomApiError) {
        return json({ error: error.message }, { status: 400 });
      }
      return json(
        { error: "Failed to connect. Please try again." },
        { status: 500 },
      );
    }
  }

  if (intent === "disconnect") {
    try {
      const connection = await prisma.shopConnection.findUnique({
        where: { shop: session.shop },
      });

      if (connection) {
        await prisma.shopConnection.delete({
          where: { shop: session.shop },
        });
        try {
          await notifyDisconnection(session.shop);
        } catch {
          // Best-effort notification — ignore errors
        }
      }

      return json({ success: true, message: "Disconnected from Bloom." });
    } catch (error) {
      return json(
        { error: "Failed to disconnect. Please try again." },
        { status: 500 },
      );
    }
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function Settings() {
  const { shop, connection } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [apiKey, setApiKey] = useState("");

  return (
    <Page title="Settings" subtitle="Manage your Bloom connection">
      <Layout>
        <Layout.Section>
          {actionData?.success && (
            <Box paddingBlockEnd="400">
              <Banner title="Success" tone="success">
                <p>{actionData.message}</p>
              </Banner>
            </Box>
          )}
          {actionData?.error && (
            <Box paddingBlockEnd="400">
              <Banner title="Error" tone="critical">
                <p>{actionData.error}</p>
              </Banner>
            </Box>
          )}

          {connection ? (
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Connected to Bloom</Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">
                    Florist: {connection.floristName || "Unknown"}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Shop: {shop}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Connected since {new Date(connection.createdAt).toLocaleDateString()}
                  </Text>
                  {connection.syncedAt && (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Last sync: {new Date(connection.syncedAt).toLocaleString()} ({connection.syncedCount} products)
                    </Text>
                  )}
                </BlockStack>
                <Form method="post">
                  <input type="hidden" name="intent" value="disconnect" />
                  <Button submit tone="critical" loading={isSubmitting}>
                    Disconnect from Bloom
                  </Button>
                </Form>
              </BlockStack>
            </Card>
          ) : (
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Connect to Bloom</Text>
                <Text as="p" variant="bodyMd">
                  Enter your Bloom API key to connect your store. You can find this in your
                  Bloom florist dashboard.
                </Text>
                <Form method="post">
                  <input type="hidden" name="intent" value="connect" />
                  <FormLayout>
                    <TextField
                      label="Bloom API Key"
                      name="bloomApiKey"
                      type="password"
                      value={apiKey}
                      onChange={setApiKey}
                      autoComplete="off"
                      helpText="Your unique API key from the Bloom dashboard"
                    />
                    <Button submit variant="primary" loading={isSubmitting}>
                      Connect to Bloom
                    </Button>
                  </FormLayout>
                </Form>
              </BlockStack>
            </Card>
          )}
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingMd">Connection Status</Text>
              <Badge tone={connection ? "success" : "attention"}>
                {connection ? "Connected" : "Not connected"}
              </Badge>
              <Text as="p" variant="bodySm" tone="subdued">
                Shop: {shop}
              </Text>
              {connection?.floristId && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Florist ID: {connection.floristId}
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
