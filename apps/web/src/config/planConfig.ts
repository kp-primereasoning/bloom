/**
 * Static subscription plan configuration for the Bloom platform.
 * 
 * For v1, plans are defined as static configuration in the web app.
 * Future versions may fetch plans from the backend.
 */

/**
 * Plan configuration interface
 */
export interface PlanConfig {
  id: string;
  name: string;
  cadence: string;
  cadenceLabel: string;
  features: string[];
  price?: string; // Optional, placeholder for v1
}

/**
 * Available subscription plans
 * Note: Plan IDs must match backend SubscriptionPlan enum values
 */
export const SUBSCRIPTION_PLANS: PlanConfig[] = [
  {
    id: 'ESSENTIAL',
    name: 'Essential',
    cadence: 'every_2_weeks',
    cadenceLabel: '',
    price: '$75 / month',
    features: [
      'Fresh flowers every 2 weeks',
      '10–12 stems',
      'Delivered to your door',
    ],
  },
  {
    id: 'SIGNATURE',
    name: 'Signature',
    cadence: 'every_2_weeks',
    cadenceLabel: '',
    price: '$100 / month',
    features: [
      'Fresh flowers every 2 weeks',
      '18–20 stems',
      '1 vase included per year',
      'Delivered to your door',
    ],
  },
  {
    id: 'STATEMENT',
    name: 'Statement',
    cadence: 'every_2_weeks',
    cadenceLabel: '',
    price: '$125 / month',
    features: [
      'Fresh flowers every 2 weeks',
      '28–30 stems',
      '4 vases included per year',
      'Quarterly vase refresh',
      'Delivered to your door',
    ],
  },
];

/**
 * Get a plan by its ID
 */
export function getPlanById(id: string): PlanConfig | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}

/**
 * Get all available plans
 */
export function getAllPlans(): PlanConfig[] {
  return SUBSCRIPTION_PLANS;
}

/**
 * Default plan ID (used when no plan is selected)
 */
export const DEFAULT_PLAN_ID = 'SIGNATURE';
