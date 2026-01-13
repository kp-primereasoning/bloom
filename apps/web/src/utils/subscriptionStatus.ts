/**
 * Subscription status display utilities.
 * 
 * Maps internal subscription status values to customer-friendly display.
 * CRITICAL: The literal string "CREATED" must NEVER appear in any return value.
 */

import type { SubscriptionStatus } from '@bloom/shared';

/**
 * Status display configuration for the UI
 */
export interface StatusDisplay {
  showPill: boolean;
  pillText: string | null;
  pillColor: string | null;
  subheader: string;
}

/**
 * Action button configuration
 */
export interface ActionButton {
  label: string;
  action: 'activate' | 'pause' | 'resume' | 'switch' | 'current';
}

/**
 * Get the display configuration for a subscription status.
 * Maps internal status to customer-friendly display.
 * 
 * IMPORTANT: Never returns the literal string "CREATED"
 */
export function getStatusDisplay(status: SubscriptionStatus | null): StatusDisplay {
  switch (status) {
    case 'ACTIVE':
      return {
        showPill: true,
        pillText: 'Active',
        pillColor: 'bg-green-100 text-green-800',
        subheader: 'Your subscription is active.',
      };
    case 'PAUSED':
      return {
        showPill: true,
        pillText: 'Paused',
        pillColor: 'bg-yellow-100 text-yellow-800',
        subheader: 'Your subscription is paused.',
      };
    case 'CREATED':
    case null:
    default:
      // For CREATED or null status, show onboarding copy
      // Never display "CREATED" to the user
      return {
        showPill: false,
        pillText: null,
        pillColor: null,
        subheader: 'Choose a plan to get started.',
      };
  }
}

/**
 * Get the action button configuration based on subscription status and plan context.
 * 
 * @param status - Current subscription status
 * @param isCurrentPlan - Whether this is the user's current plan
 * @returns Action button config or null if no action available
 */
export function getActionButton(
  status: SubscriptionStatus | null,
  isCurrentPlan: boolean
): ActionButton | null {
  // For CREATED or null status, all plans show "Activate this plan"
  if (status === 'CREATED' || status === null) {
    return { label: 'Activate this plan', action: 'activate' };
  }

  // For ACTIVE status - current plan shows "Pause subscription"
  if (status === 'ACTIVE') {
    if (isCurrentPlan) {
      return { label: 'Pause subscription', action: 'pause' };
    }
    return { label: 'Switch to this plan', action: 'switch' };
  }

  // For PAUSED status
  if (status === 'PAUSED') {
    if (isCurrentPlan) {
      return { label: 'Resume subscription', action: 'resume' };
    }
    return { label: 'Switch to this plan', action: 'switch' };
  }

  return null;
}

/**
 * Check if a status represents an active subscription (not needing activation)
 */
export function isSubscriptionActive(status: SubscriptionStatus | null): boolean {
  return status === 'ACTIVE' || status === 'PAUSED';
}

/**
 * Check if a status requires onboarding/activation
 */
export function needsActivation(status: SubscriptionStatus | null): boolean {
  return status === 'CREATED' || status === null;
}
