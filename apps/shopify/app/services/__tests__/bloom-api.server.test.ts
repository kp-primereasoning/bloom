import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Because vi.resetModules() gives each dynamic import its own class identity,
// instanceof checks across module boundaries fail. We use duck-typing helpers
// to verify BloomApiError instances instead.
// ---------------------------------------------------------------------------

function isBloomApiError(err: unknown): err is { name: string; code: string; message: string; statusCode?: number } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as any).name === "BloomApiError" &&
    typeof (err as any).code === "string" &&
    typeof (err as any).message === "string"
  );
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  process.env.BLOOM_API_URL = "http://test-bloom.local";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.resetModules();
});

/**
 * Dynamically import the module so each test gets a fresh copy that picks up
 * the mocked fetch.
 */
async function importBloomApi() {
  return await import("../bloom-api.server");
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates empty or whitespace-only strings. */
const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(""),
  fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 20 })
    .map((chars) => chars.join("")),
);

/** Generates non-empty, non-whitespace API key strings. */
const apiKeyArb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);

/** Generates a Bloom error envelope. */
const errorEnvelopeArb = fc.record({
  error: fc.record({
    code: fc.string({ minLength: 1, maxLength: 30 }),
    message: fc.string({ minLength: 1, maxLength: 200 }),
  }),
});

/** Generates a valid validateApiKey success response. */
const validateSuccessArb = fc.record({
  valid: fc.boolean(),
  florist_id: fc.option(fc.uuid(), { nil: undefined }),
  florist_name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});


// ---------------------------------------------------------------------------
// Property 2: Invalid API key rejection
// Feature: shopify-app, Property 2: Invalid API key rejection
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------

describe("Property 2: Invalid API key rejection", () => {
  it("rejects empty or whitespace-only API keys with an error", async () => {
    await fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArb, async (badKey) => {
        // Mock fetch to return 401 for any request with an empty/whitespace key
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { code: "INVALID_API_KEY", message: "Invalid API key" },
            }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          ),
        );

        const { validateApiKey } = await importBloomApi();

        try {
          await validateApiKey(badKey);
          expect.unreachable("Expected BloomApiError to be thrown");
        } catch (err) {
          expect(isBloomApiError(err)).toBe(true);
          if (isBloomApiError(err)) {
            expect(err.statusCode).toBe(401);
            expect(err.code).toBe("INVALID_API_KEY");
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: API key header authentication
// Feature: shopify-app, Property 9: API key header authentication
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------

describe("Property 9: API key header authentication", () => {
  it("includes X-API-Key header matching the provided key on every request", async () => {
    await fc.assert(
      fc.asyncProperty(apiKeyArb, async (key) => {
        const capturedHeaders: Record<string, string>[] = [];

        globalThis.fetch = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
          const hdrs = init?.headers as Record<string, string> | undefined;
          if (hdrs) capturedHeaders.push({ ...hdrs });
          return Promise.resolve(
            new Response(
              JSON.stringify({ valid: true, florist_id: "f-1", florist_name: "Test" }),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        });

        const { validateApiKey } = await importBloomApi();
        await validateApiKey(key);

        expect(capturedHeaders.length).toBeGreaterThanOrEqual(1);
        const lastHeaders = capturedHeaders[capturedHeaders.length - 1];
        expect(lastHeaders["X-API-Key"]).toBe(key);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: API response deserialization
// Feature: shopify-app, Property 10: API response deserialization
// Validates: Requirements 7.2, 7.5
// ---------------------------------------------------------------------------

describe("Property 10: API response deserialization", () => {
  it("extracts error code and message from Bloom error envelopes", async () => {
    await fc.assert(
      fc.asyncProperty(
        errorEnvelopeArb,
        fc.integer({ min: 400, max: 599 }),
        async (envelope, statusCode) => {
          globalThis.fetch = vi.fn().mockResolvedValue(
            new Response(JSON.stringify(envelope), {
              status: statusCode,
              headers: { "Content-Type": "application/json" },
            }),
          );

          const { validateApiKey } = await importBloomApi();

          try {
            await validateApiKey("some-key");
            expect.unreachable("Expected BloomApiError to be thrown");
          } catch (err) {
            expect(isBloomApiError(err)).toBe(true);
            if (isBloomApiError(err)) {
              expect(err.code).toBe(envelope.error.code);
              expect(err.message).toBe(envelope.error.message);
              expect(err.statusCode).toBe(statusCode);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("parses valid success responses without data loss", async () => {
    await fc.assert(
      fc.asyncProperty(validateSuccessArb, async (successBody) => {
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify(successBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );

        const { validateApiKey } = await importBloomApi();
        const result = await validateApiKey("valid-key");

        expect(result.valid).toBe(successBody.valid);
        if (successBody.florist_id !== undefined) {
          expect(result.florist_id).toBe(successBody.florist_id);
        }
        if (successBody.florist_name !== undefined) {
          expect(result.florist_name).toBe(successBody.florist_name);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("throws PARSE_ERROR for invalid JSON responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("not-json{{{", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { validateApiKey } = await importBloomApi();

    try {
      await validateApiKey("some-key");
      expect.unreachable("Expected BloomApiError to be thrown");
    } catch (err) {
      expect(isBloomApiError(err)).toBe(true);
      if (isBloomApiError(err)) {
        expect(err.code).toBe("PARSE_ERROR");
      }
    }
  });

  it("throws NETWORK_ERROR when fetch itself fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const { validateApiKey } = await importBloomApi();

    try {
      await validateApiKey("some-key");
      expect.unreachable("Expected BloomApiError to be thrown");
    } catch (err) {
      expect(isBloomApiError(err)).toBe(true);
      if (isBloomApiError(err)) {
        expect(err.code).toBe("NETWORK_ERROR");
      }
    }
  });
});
