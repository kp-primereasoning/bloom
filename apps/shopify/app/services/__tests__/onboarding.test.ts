import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  deriveOnboardingState,
  type ShopConnectionInput,
} from "../onboarding.server";
import type { TierMapping, BloomTier } from "../bloom-api.server";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a ShopConnectionInput or null. */
const connectionArb: fc.Arbitrary<ShopConnectionInput | null> = fc.oneof(
  fc.constant(null),
  fc.record({
    floristId: fc.option(fc.uuid(), { nil: null }),
  }),
);

/** Generates a single TierMapping. */
const tierMappingArb: fc.Arbitrary<TierMapping> = fc.record({
  tier: fc.constantFrom<BloomTier>("ESSENTIAL", "SIGNATURE", "STATEMENT"),
  shopify_product_id: fc.string({ minLength: 1, maxLength: 60 }),
  product_title: fc.string({ minLength: 1, maxLength: 80 }),
  product_price: fc
    .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."), {
      minLength: 1,
      maxLength: 10,
    })
    .map((chars) => chars.join("")),
  mapped_at: fc.date().map((d) => d.toISOString()),
});

/** Generates a list of 0–5 tier mappings. */
const tierMappingsArb = fc.array(tierMappingArb, { minLength: 0, maxLength: 5 });

/** Generates a florist status string or null. */
const floristStatusArb: fc.Arbitrary<string | null> = fc.oneof(
  fc.constant(null),
  fc.constant("READY"),
  fc.constant("PENDING"),
  fc.constant("INACTIVE"),
  fc.string({ minLength: 1, maxLength: 20 }),
);

// ---------------------------------------------------------------------------
// Property 5: Onboarding state derivation invariant
// Feature: shopify-app, Property 5: Onboarding state derivation invariant
// Validates: Requirements 5.2, 5.3, 5.5, 5.6
// ---------------------------------------------------------------------------

describe("Property 5: Onboarding state derivation invariant", () => {
  it("step ordering: !step1 → !step2 && !step3", () => {
    fc.assert(
      fc.property(connectionArb, tierMappingsArb, floristStatusArb, (conn, mappings, status) => {
        const state = deriveOnboardingState(conn, mappings, status);

        if (!state.step1_linkStore) {
          expect(state.step2_linkProducts).toBe(false);
          expect(state.step3_deliveries).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("step ordering: !step2 → !step3", () => {
    fc.assert(
      fc.property(connectionArb, tierMappingsArb, floristStatusArb, (conn, mappings, status) => {
        const state = deriveOnboardingState(conn, mappings, status);

        if (!state.step2_linkProducts) {
          expect(state.step3_deliveries).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it("isComplete === (step1 && step2 && step3)", () => {
    fc.assert(
      fc.property(connectionArb, tierMappingsArb, floristStatusArb, (conn, mappings, status) => {
        const state = deriveOnboardingState(conn, mappings, status);

        const expected =
          state.step1_linkStore && state.step2_linkProducts && state.step3_deliveries;
        expect(state.isComplete).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("all three invariants hold simultaneously for any input", () => {
    fc.assert(
      fc.property(connectionArb, tierMappingsArb, floristStatusArb, (conn, mappings, status) => {
        const state = deriveOnboardingState(conn, mappings, status);

        // Invariant 1: !step1 → !step2 && !step3
        if (!state.step1_linkStore) {
          expect(state.step2_linkProducts).toBe(false);
          expect(state.step3_deliveries).toBe(false);
        }

        // Invariant 2: !step2 → !step3
        if (!state.step2_linkProducts) {
          expect(state.step3_deliveries).toBe(false);
        }

        // Invariant 3: isComplete === (step1 && step2 && step3)
        expect(state.isComplete).toBe(
          state.step1_linkStore && state.step2_linkProducts && state.step3_deliveries,
        );
      }),
      { numRuns: 100 },
    );
  });
});
