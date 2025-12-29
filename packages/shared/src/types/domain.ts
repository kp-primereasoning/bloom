/**
 * Domain entity types for the Bloom platform.
 * 
 * These types match the API response structures for Property, Florist,
 * and PropertyAssignment entities.
 */

/**
 * Property status lifecycle
 */
export enum PropertyStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACTIVE = 'ACTIVE',
}

/**
 * Florist status lifecycle
 */
export enum FloristStatus {
  ONBOARDING = 'ONBOARDING',
  READY = 'READY',
}

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
