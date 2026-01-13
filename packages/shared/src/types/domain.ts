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
  CREATED: 'CREATED',           // No florist, no PM
  PENDING_FLORIST: 'PENDING_FLORIST',  // Has PM, needs florist
  PENDING_PM: 'PENDING_PM',     // Has florist, needs PM
  ACTIVE: 'ACTIVE',             // Has both florist and PM
} as const;

export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

/**
 * User subscription status lifecycle
 */
export const SubscriptionStatus = {
  CREATED: 'CREATED',   // Account created, no subscription
  ACTIVE: 'ACTIVE',     // Active subscription
  PAUSED: 'PAUSED',     // Subscription paused
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

/**
 * Florist status lifecycle
 */
export const FloristStatus = {
  ONBOARDING: 'ONBOARDING',
  READY: 'READY',
} as const;

export type FloristStatus = (typeof FloristStatus)[keyof typeof FloristStatus];

/**
 * Property entity - a physical location participating in Bloom's floral subscription program
 */
export interface Property {
  id: string;
  name: string;
  address: string;
  status: PropertyStatus;
  delivery_cadence: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Enriched property entity - includes computed fields for admin table
 */
export interface EnrichedProperty {
  id: string;
  name: string;
  address: string;
  status: PropertyStatus;
  delivery_cadence: string | null;
  total_users: number;
  active_users: number;
  florist_name: string | null;
  property_manager_email: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Florist entity - a flower vendor connected to the Bloom platform
 */
export interface Florist {
  id: string;
  name: string;
  status: FloristStatus;
  created_at: string;
}

/**
 * Property-Florist assignment - links a florist to a property for fulfillment
 */
export interface PropertyAssignment {
  id: string;
  property_id: string;
  florist_id: string;
  active: boolean;
  created_at: string;
}

// =============================================================================
// Request Types
// =============================================================================

/**
 * Request body for creating a new property
 */
export interface CreatePropertyRequest {
  name: string;
  address: string;
  delivery_cadence?: string;
}

/**
 * Request body for updating an existing property
 */
export interface UpdatePropertyRequest {
  name?: string;
  address?: string;
  status?: PropertyStatus;
  delivery_cadence?: string;
}

/**
 * Request body for creating a new florist
 */
export interface CreateFloristRequest {
  name: string;
}

/**
 * Request body for creating a property-florist assignment
 */
export interface CreatePropertyAssignmentRequest {
  property_id: string;
  florist_id: string;
}

/**
 * Request body for assigning a property manager to a property
 */
export interface AssignPMRequest {
  user_id: string;
}

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

// =============================================================================
// User Types
// =============================================================================

import type { UserRole } from './roles';

/**
 * User entity - a user account in the Bloom platform
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  subscription_status: SubscriptionStatus | null;
  created_at: string;
}

/**
 * Admin user entity - enriched user data for admin table
 * Includes property_name resolved from property_id
 * subscription_status is null for non-CUSTOMER users
 */
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  property_name: string | null;
  subscription_status: SubscriptionStatus | null;
  created_at: string;
}

/**
 * Request body for creating a new user
 */
export interface CreateUserRequest {
  email: string;
  role: UserRole;
  password: string;
  property_id?: string;  // Only valid for PROPERTY_MANAGER role
}

/**
 * Request body for updating an existing user
 */
export interface UpdateUserRequest {
  role?: UserRole;
  property_id?: string | null;
  subscription_status?: SubscriptionStatus;
}


// =============================================================================
// Onboarding Types
// =============================================================================

/**
 * Minimal property info for public listing during onboarding
 */
export interface PropertyListItem {
  id: string;
  name: string;
  address: string;
}

/**
 * Request body for customer self-registration
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Response from customer registration (same format as login)
 */
export interface RegisterResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Request body for customer property assignment
 */
export interface MePropertyUpdateRequest {
  property_id: string;
  unit: string;
}

/**
 * Request body for customer subscription update
 * Only ACTIVE or PAUSED allowed (not CREATED)
 */
export interface MeSubscriptionUpdateRequest {
  subscription_status: 'ACTIVE' | 'PAUSED';
}

/**
 * Request body for customer plan selection
 */
export interface MePlanUpdateRequest {
  plan: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT';
}

// =============================================================================
// Customer Dashboard Types
// =============================================================================

/**
 * Response from GET /auth/me with enriched property data for dashboard
 * Includes property_name and property_address resolved server-side from property_id
 */
export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  property_name: string | null;
  property_address: string | null;
  unit: string | null;
  subscription_status: SubscriptionStatus | null;
  subscription_plan: SubscriptionPlan | null;
  created_at: string;
}

// =============================================================================
// Delivery Types
// =============================================================================

/**
 * Subscription plan tiers
 */
export const SubscriptionPlan = {
  ESSENTIAL: 'ESSENTIAL',   // Basic floral arrangement
  SIGNATURE: 'SIGNATURE',   // Premium floral arrangement
  STATEMENT: 'STATEMENT',   // Luxury floral arrangement
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

/**
 * Delivery status lifecycle
 */
export const DeliveryStatus = {
  SCHEDULED: 'SCHEDULED',   // Delivery is planned for a future date
  DELIVERED: 'DELIVERED',   // Delivery was successfully completed
  SKIPPED: 'SKIPPED',       // Customer chose to skip this delivery
  MISSED: 'MISSED',         // Delivery was not completed
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

/**
 * Array of all subscription plans for iteration
 */
export const ALL_SUBSCRIPTION_PLANS = Object.values(SubscriptionPlan);

/**
 * Array of all delivery statuses for iteration
 */
export const ALL_DELIVERY_STATUSES = Object.values(DeliveryStatus);

/**
 * Delivery entity - a scheduled or completed floral delivery
 */
export interface Delivery {
  id: string;
  user_id: string;
  property_id: string;
  subscription_plan: SubscriptionPlan;
  status: DeliveryStatus;
  scheduled_for: string;
  delivered_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Response from GET /me/deliveries
 * Contains next scheduled delivery and delivery history
 */
export interface MeDeliveriesResponse {
  next_delivery: Delivery | null;
  history: Delivery[];
}

// =============================================================================
// Florist Dashboard Types
// =============================================================================

/**
 * Assigned property info for florist dashboard
 */
export interface AssignedProperty {
  property_id: string;
  property_name: string;
  property_address: string;
}

/**
 * Response from GET /florist/me
 * Returns florist profile with assigned properties
 */
export interface FloristMeResponse {
  florist_id: string;
  florist_name: string;
  florist_status: FloristStatus;
  assigned_properties: AssignedProperty[];
}

/**
 * Delivery info for florist deliveries list
 * Includes customer and property details for display
 */
export interface FloristDelivery {
  id: string;
  customer_email: string;
  property_id: string;
  property_name: string;
  property_address: string;
  subscription_plan: SubscriptionPlan;
  status: DeliveryStatus;
  scheduled_for: string;
}

/**
 * Response from GET /florist/deliveries
 * Returns list of upcoming deliveries for assigned properties
 */
export interface FloristDeliveriesListResponse {
  deliveries: FloristDelivery[];
}

/**
 * Request body for updating delivery status
 * Only DELIVERED or MISSED allowed (florist actions)
 */
export interface UpdateDeliveryStatusRequest {
  status: 'DELIVERED' | 'MISSED';
}
