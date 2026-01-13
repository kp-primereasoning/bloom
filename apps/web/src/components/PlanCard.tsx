/**
 * PlanCard component for displaying subscription plan options.
 * 
 * Renders a card with plan details and contextual action button
 * based on the current subscription status.
 */

import type { SubscriptionStatus } from '@bloom/shared';
import type { PlanConfig } from '@/config/planConfig';
import { getActionButton } from '@/utils/subscriptionStatus';

/**
 * Action types that can be triggered from a plan card
 */
export type PlanAction =
  | { type: 'activate'; planId: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'switch'; planId: string };

interface PlanCardProps {
  plan: PlanConfig;
  isCurrentPlan: boolean;
  subscriptionStatus: SubscriptionStatus | null;
  onAction: (action: PlanAction) => void;
  isLoading: boolean;
}

/**
 * PlanCard displays a subscription plan with its details and action button.
 * 
 * - Shows plan name, cadence, and features
 * - Highlights current plan with distinct styling
 * - Renders contextual action button based on subscription status
 * - Disables button during loading state
 */
export function PlanCard({
  plan,
  isCurrentPlan,
  subscriptionStatus,
  onAction,
  isLoading,
}: PlanCardProps) {
  const actionButton = getActionButton(subscriptionStatus, isCurrentPlan);

  const handleClick = () => {
    if (!actionButton || isLoading || actionButton.action === 'current') return;

    switch (actionButton.action) {
      case 'activate':
        onAction({ type: 'activate', planId: plan.id });
        break;
      case 'pause':
        onAction({ type: 'pause' });
        break;
      case 'resume':
        onAction({ type: 'resume' });
        break;
      case 'switch':
        onAction({ type: 'switch', planId: plan.id });
        break;
    }
  };

  // Button styling based on action type
  const getButtonStyles = () => {
    if (!actionButton) return '';

    const baseStyles =
      'w-full py-2 px-4 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

    switch (actionButton.action) {
      case 'activate':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700`;
      case 'pause':
        return `${baseStyles} bg-yellow-600 text-white hover:bg-yellow-700`;
      case 'resume':
        return `${baseStyles} bg-green-600 text-white hover:bg-green-700`;
      case 'switch':
        return `${baseStyles} bg-gray-600 text-white hover:bg-gray-700`;
      case 'current':
        return `${baseStyles} bg-gray-300 text-gray-500 cursor-not-allowed`;
      default:
        return baseStyles;
    }
  };

  const isButtonDisabled = isLoading || actionButton?.action === 'current';

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 flex flex-col ${
        isCurrentPlan
          ? 'ring-2 ring-green-500 border-green-500'
          : 'border border-gray-200'
      }`}
      data-testid={`plan-card-${plan.id}`}
    >
      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="mb-3">
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Current plan
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-xl font-bold text-gray-900 mb-1" data-testid="plan-name">
        {plan.name}
      </h3>

      {/* Cadence label */}
      {plan.cadenceLabel && (
        <p className="text-sm text-gray-500 mb-4" data-testid="plan-cadence">
          {plan.cadenceLabel}
        </p>
      )}

      {/* Price placeholder */}
      {plan.price ? (
        <p className="text-2xl font-bold text-gray-900 mb-4">{plan.price}</p>
      ) : (
        <p className="text-lg text-gray-400 mb-4">Pricing coming soon</p>
      )}

      {/* Features list */}
      <ul className="flex-grow space-y-2 mb-6" data-testid="plan-features">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start text-sm text-gray-600">
            <svg
              className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span data-testid="plan-feature">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Action button */}
      {actionButton && (
        <button
          onClick={handleClick}
          disabled={isButtonDisabled}
          className={getButtonStyles()}
          data-testid="plan-action-button"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading...
            </span>
          ) : (
            actionButton.label
          )}
        </button>
      )}
    </div>
  );
}
