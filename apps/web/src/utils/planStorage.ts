/**
 * Plan selection storage utilities.
 * 
 * For v1, plan selection is stored in localStorage.
 * TODO: Persist subscription_plan to backend when field is available.
 */

const SELECTED_PLAN_KEY = 'bloom_selected_plan';

/**
 * Get the selected plan ID from localStorage.
 */
export function getSelectedPlan(): string | null {
  return localStorage.getItem(SELECTED_PLAN_KEY);
}

/**
 * Save the selected plan ID to localStorage.
 * 
 * TODO: Persist subscription_plan to backend when field is available.
 */
export function setSelectedPlan(planId: string): void {
  localStorage.setItem(SELECTED_PLAN_KEY, planId);
  // TODO: Persist subscription_plan to backend when field is available
  console.log('TODO: Persist subscription_plan to backend when field is available');
}

/**
 * Clear the selected plan from localStorage.
 */
export function clearSelectedPlan(): void {
  localStorage.removeItem(SELECTED_PLAN_KEY);
}
