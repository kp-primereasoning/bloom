/**
 * Onboarding state derivation — pure function, no side effects.
 *
 * Derives the three-step onboarding progress from existing data:
 *   Step 1: Link Store   — ShopConnection exists with a valid floristId
 *   Step 2: Link Products — At least one tier mapping exists
 *   Step 3: Deliveries    — Florist status is READY
 */

import type { TierMapping } from "./bloom-api.server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal input shape — only the field we actually inspect. */
export interface ShopConnectionInput {
  floristId: string | null;
}

export interface OnboardingState {
  step1_linkStore: boolean;
  step2_linkProducts: boolean;
  step3_deliveries: boolean;
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Derive the current onboarding state from existing data.
 *
 * Invariants:
 *  1. step1 false  → step2 and step3 must be false
 *  2. step2 false  → step3 must be false
 *  3. isComplete === (step1 && step2 && step3)
 */
export function deriveOnboardingState(
  connection: ShopConnectionInput | null,
  tierMappings: TierMapping[],
  floristStatus: string | null,
): OnboardingState {
  const step1 = connection !== null && connection.floristId !== null;
  const step2 = step1 && tierMappings.length > 0;
  const step3 = step2 && floristStatus === "READY";

  return {
    step1_linkStore: step1,
    step2_linkProducts: step2,
    step3_deliveries: step3,
    isComplete: step1 && step2 && step3,
  };
}
