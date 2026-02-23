import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import * as fc from "fast-check";
import { PrismaClient } from "@prisma/client";

// Use a dedicated test database so we don't touch dev data
const prisma = new PrismaClient({
  datasources: { db: { url: "file:./test-roundtrip.db" } },
});

// Feature: shopify-app, Property 1: Connection round-trip
// **Validates: Requirements 1.1, 1.4**

describe("Property 1: Connection round-trip", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up all test data and disconnect
    await prisma.shopConnection.deleteMany({});
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.shopConnection.deleteMany({});
  });

  // Generator: valid Shopify-style shop domains (alphanumeric + hyphens)
  const shopDomainArb = fc
    .stringMatching(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/)
    .map((s) => `${s}.myshopify.com`);

  // Generator: non-empty API key strings (no null bytes)
  const apiKeyArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0 && !s.includes("\x00"));

  it("connect then disconnect leaves no ShopConnection for any shop domain + API key", async () => {
    await fc.assert(
      fc.asyncProperty(shopDomainArb, apiKeyArb, async (shopDomain, apiKey) => {
        // Ensure clean slate for this domain
        await prisma.shopConnection.deleteMany({ where: { shop: shopDomain } });

        // Step 1: Connect — create a ShopConnection (simulates Req 1.1)
        const created = await prisma.shopConnection.create({
          data: {
            shop: shopDomain,
            bloomApiKey: apiKey,
            floristId: "test-florist-id",
            floristName: "Test Florist",
          },
        });

        // Verify connection was persisted
        const afterConnect = await prisma.shopConnection.findUnique({
          where: { shop: shopDomain },
        });
        expect(afterConnect).not.toBeNull();
        expect(afterConnect!.id).toBe(created.id);
        expect(afterConnect!.bloomApiKey).toBe(apiKey);
        expect(afterConnect!.shop).toBe(shopDomain);

        // Step 2: Disconnect — delete the ShopConnection (simulates Req 1.4)
        await prisma.shopConnection.delete({
          where: { shop: shopDomain },
        });

        // Verify connection no longer exists
        const afterDisconnect = await prisma.shopConnection.findUnique({
          where: { shop: shopDomain },
        });
        expect(afterDisconnect).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
