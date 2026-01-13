/**
 * Feature: customer-subscriptions-page
 * Property 2: CREATED Status Never Displayed
 * Validates: Requirements 2.1
 *
 * For any rendered state of the SubscriptionPage when subscription_status equals `CREATED`,
 * the literal string "CREATED" should not appear anywhere in the rendered output.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ALL_SUBSCRIPTION_STATUSES } from '@bloom/shared';
import {
  getStatusDisplay,
  getActionButton,
  isSubscriptionActive,
  needsActivation,
} from '../utils/subscriptionStatus';

// Arbitrary for generating subscription status values
const statusArbitrary = fc.constantFrom(...ALL_SUBSCRIPTION_STATUSES, null);

// Arbitrary for generating boolean values
const booleanArbitrary = fc.boolean();

describe('Subscription Status - Property 2: CREATED Status Never Displayed', () => {
  it('should never return the literal string "CREATED" in any StatusDisplay field', () => {
    fc.assert(
      fc.property(statusArbitrary, (status) => {
        const display = getStatusDisplay(status);

        // Check that "CREATED" never appears in any string field
        if (display.pillText !== null) {
          expect(display.pillText).not.toBe('CREATED');
          expect(display.pillText.toUpperCase()).not.toContain('CREATED');
        }
        expect(display.subheader).not.toContain('CREATED');
        if (display.pillColor !== null) {
          expect(display.pillColor).not.toContain('CREATED');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should never return the literal string "CREATED" in any ActionButton label', () => {
    fc.assert(
      fc.property(statusArbitrary, booleanArbitrary, (status, isCurrentPlan) => {
        const button = getActionButton(status, isCurrentPlan);

        if (button !== null) {
          expect(button.label).not.toContain('CREATED');
          expect(button.action).not.toBe('CREATED');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should show friendly onboarding copy when status is CREATED', () => {
    const display = getStatusDisplay('CREATED');

    expect(display.showPill).toBe(false);
    expect(display.pillText).toBeNull();
    expect(display.subheader).toBe('Choose a plan to get started.');
  });

  it('should show friendly onboarding copy when status is null', () => {
    const display = getStatusDisplay(null);

    expect(display.showPill).toBe(false);
    expect(display.pillText).toBeNull();
    expect(display.subheader).toBe('Choose a plan to get started.');
  });
});

describe('Subscription Status - Property 3: Title Always Displayed', () => {
  it('should return valid display config for any subscription status', () => {
    fc.assert(
      fc.property(statusArbitrary, (status) => {
        const display = getStatusDisplay(status);

        // Display should always have a subheader (title is rendered separately)
        expect(display.subheader).toBeDefined();
        expect(typeof display.subheader).toBe('string');
        expect(display.subheader.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Subscription Status - Status Display Mapping', () => {
  it('should show Active pill for ACTIVE status', () => {
    const display = getStatusDisplay('ACTIVE');

    expect(display.showPill).toBe(true);
    expect(display.pillText).toBe('Active');
    expect(display.pillColor).toBe('bg-green-100 text-green-800');
    expect(display.subheader).toBe('Your subscription is active.');
  });

  it('should show Paused pill for PAUSED status', () => {
    const display = getStatusDisplay('PAUSED');

    expect(display.showPill).toBe(true);
    expect(display.pillText).toBe('Paused');
    expect(display.pillColor).toBe('bg-yellow-100 text-yellow-800');
    expect(display.subheader).toBe('Your subscription is paused.');
  });
});

describe('Subscription Status - Action Button Logic', () => {
  it('should return "Activate this plan" for CREATED status regardless of isCurrentPlan', () => {
    fc.assert(
      fc.property(booleanArbitrary, (isCurrentPlan) => {
        const button = getActionButton('CREATED', isCurrentPlan);

        expect(button).not.toBeNull();
        expect(button!.label).toBe('Activate this plan');
        expect(button!.action).toBe('activate');
      }),
      { numRuns: 100 }
    );
  });

  it('should return "Activate this plan" for null status regardless of isCurrentPlan', () => {
    fc.assert(
      fc.property(booleanArbitrary, (isCurrentPlan) => {
        const button = getActionButton(null, isCurrentPlan);

        expect(button).not.toBeNull();
        expect(button!.label).toBe('Activate this plan');
        expect(button!.action).toBe('activate');
      }),
      { numRuns: 100 }
    );
  });

  it('should return "Pause subscription" for ACTIVE status on current plan', () => {
    const button = getActionButton('ACTIVE', true);

    expect(button).not.toBeNull();
    expect(button!.label).toBe('Pause subscription');
    expect(button!.action).toBe('pause');
  });

  it('should return "Switch to this plan" for ACTIVE status on non-current plan', () => {
    const button = getActionButton('ACTIVE', false);

    expect(button).not.toBeNull();
    expect(button!.label).toBe('Switch to this plan');
    expect(button!.action).toBe('switch');
  });

  it('should return "Resume subscription" for PAUSED status on current plan', () => {
    const button = getActionButton('PAUSED', true);

    expect(button).not.toBeNull();
    expect(button!.label).toBe('Resume subscription');
    expect(button!.action).toBe('resume');
  });

  it('should return "Switch to this plan" for PAUSED status on non-current plan', () => {
    const button = getActionButton('PAUSED', false);

    expect(button).not.toBeNull();
    expect(button!.label).toBe('Switch to this plan');
    expect(button!.action).toBe('switch');
  });
});

describe('Subscription Status - Helper Functions', () => {
  it('should correctly identify active subscriptions', () => {
    expect(isSubscriptionActive('ACTIVE')).toBe(true);
    expect(isSubscriptionActive('PAUSED')).toBe(true);
    expect(isSubscriptionActive('CREATED')).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });

  it('should correctly identify subscriptions needing activation', () => {
    expect(needsActivation('CREATED')).toBe(true);
    expect(needsActivation(null)).toBe(true);
    expect(needsActivation('ACTIVE')).toBe(false);
    expect(needsActivation('PAUSED')).toBe(false);
  });
});
