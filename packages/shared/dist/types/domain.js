/**
 * Domain entity types for the Bloom platform.
 *
 * These types match the API response structures for Property, Florist,
 * and PropertyAssignment entities.
 */
/**
 * Property status lifecycle - computed based on florist and PM assignments
 */
export const PropertyStatus = {
    CREATED: 'CREATED', // No florist, no PM
    PENDING_FLORIST: 'PENDING_FLORIST', // Has PM, needs florist
    PENDING_PM: 'PENDING_PM', // Has florist, needs PM
    ACTIVE: 'ACTIVE', // Has both florist and PM
};
/**
 * User subscription status lifecycle
 */
export const SubscriptionStatus = {
    CREATED: 'CREATED', // Account created, no subscription
    ACTIVE: 'ACTIVE', // Active subscription
    PAUSED: 'PAUSED', // Subscription paused
};
/**
 * Florist status lifecycle
 */
export const FloristStatus = {
    ONBOARDING: 'ONBOARDING',
    READY: 'READY',
};
// =============================================================================
// Array helpers for iteration
// =============================================================================
/**
 * Array of all property statuses for iteration
 */
export const ALL_PROPERTY_STATUSES = Object.values(PropertyStatus);
/**
 * Array of all florist statuses for iteration
 */
export const ALL_FLORIST_STATUSES = Object.values(FloristStatus);
/**
 * Array of all subscription statuses for iteration
 */
export const ALL_SUBSCRIPTION_STATUSES = Object.values(SubscriptionStatus);
