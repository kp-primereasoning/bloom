/**
 * Domain entity types for the Bloom platform.
 *
 * These types match the API response structures for Property, Florist,
 * and PropertyAssignment entities.
 */
/**
 * Property status lifecycle - computed based on florist and PM assignments
 */
export declare const PropertyStatus: {
    readonly CREATED: "CREATED";
    readonly PENDING_FLORIST: "PENDING_FLORIST";
    readonly PENDING_PM: "PENDING_PM";
    readonly ACTIVE: "ACTIVE";
};
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];
/**
 * User subscription status lifecycle
 */
export declare const SubscriptionStatus: {
    readonly CREATED: "CREATED";
    readonly ACTIVE: "ACTIVE";
    readonly PAUSED: "PAUSED";
};
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
/**
 * Florist status lifecycle
 */
export declare const FloristStatus: {
    readonly ONBOARDING: "ONBOARDING";
    readonly READY: "READY";
};
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
/**
 * Array of all property statuses for iteration
 */
export declare const ALL_PROPERTY_STATUSES: ("CREATED" | "ACTIVE" | "PENDING_FLORIST" | "PENDING_PM")[];
/**
 * Array of all florist statuses for iteration
 */
export declare const ALL_FLORIST_STATUSES: ("ONBOARDING" | "READY")[];
/**
 * Array of all subscription statuses for iteration
 */
export declare const ALL_SUBSCRIPTION_STATUSES: ("CREATED" | "ACTIVE" | "PAUSED")[];
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
    property_id?: string;
}
/**
 * Request body for updating an existing user
 */
export interface UpdateUserRequest {
    role?: UserRole;
    property_id?: string | null;
    subscription_status?: SubscriptionStatus;
}
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
}
/**
 * Request body for customer subscription update
 * Only ACTIVE or PAUSED allowed (not CREATED)
 */
export interface MeSubscriptionUpdateRequest {
    subscription_status: 'ACTIVE' | 'PAUSED';
}
/**
 * Response from GET /auth/me with enriched property data for dashboard
 * Includes property_name resolved server-side from property_id
 */
export interface MeResponse {
    id: string;
    email: string;
    role: UserRole;
    property_id: string | null;
    property_name: string | null;
    subscription_status: SubscriptionStatus | null;
    created_at: string;
}
//# sourceMappingURL=domain.d.ts.map