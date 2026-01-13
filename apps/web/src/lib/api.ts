/**
 * API client helper for making authenticated requests.
 */

import type { ApiErrorResponse } from '@bloom/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'bloom_auth_token';

/**
 * Get the stored auth token from localStorage.
 */
export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set the auth token in localStorage.
 */
export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Clear the auth token from localStorage.
 */
export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Make an authenticated API request.
 * 
 * @param endpoint - API endpoint (e.g., '/auth/login')
 * @param options - Fetch options
 * @returns Parsed JSON response
 * @throws Error with message from API error response
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData: ApiErrorResponse = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // If we can't parse the error, use the status text
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * API base URL for direct use if needed.
 */
export { API_BASE_URL };


// =============================================================================
// Onboarding API Methods
// =============================================================================

import type {
  RegisterRequest,
  RegisterResponse,
  PropertyListItem,
  MePropertyUpdateRequest,
  MeSubscriptionUpdateRequest,
  MePlanUpdateRequest,
  MeResponse,
  MeDeliveriesResponse,
  User,
  FAQResponse,
} from '@bloom/shared';

/**
 * Get current authenticated user with enriched property data.
 * Requires authentication.
 * Returns user info including property_name resolved server-side.
 */
export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me');
}

/**
 * Register a new customer account.
 * Public endpoint - no authentication required.
 */
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * List all available properties for customer selection.
 * Public endpoint - no authentication required.
 */
export async function listProperties(): Promise<PropertyListItem[]> {
  return apiRequest<PropertyListItem[]>('/properties');
}

/**
 * Update the current customer's property assignment.
 * Requires CUSTOMER role authentication.
 */
export async function updateMyProperty(data: MePropertyUpdateRequest): Promise<User> {
  return apiRequest<User>('/me/property', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Update the current customer's subscription status.
 * Requires CUSTOMER role authentication.
 * Only ACTIVE or PAUSED status allowed.
 */
export async function updateMySubscription(data: MeSubscriptionUpdateRequest): Promise<MeResponse> {
  return apiRequest<MeResponse>('/me/subscription', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Update the current customer's subscription plan.
 * Requires CUSTOMER role authentication.
 * Valid plans: ESSENTIAL, SIGNATURE, STATEMENT.
 */
export async function updateMyPlan(data: MePlanUpdateRequest): Promise<MeResponse> {
  return apiRequest<MeResponse>('/me/plan', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}


// =============================================================================
// Delivery API Methods
// =============================================================================

/**
 * Get current customer's deliveries.
 * Requires CUSTOMER role authentication.
 * Returns next scheduled delivery and delivery history.
 */
export async function getMyDeliveries(): Promise<MeDeliveriesResponse> {
  return apiRequest<MeDeliveriesResponse>('/me/deliveries');
}


// =============================================================================
// FAQ API Methods
// =============================================================================

/**
 * Get FAQ content from static configuration.
 * Public endpoint - no authentication required.
 * Returns FAQ items with markdown-formatted answers.
 */
export async function getFAQ(): Promise<FAQResponse> {
  return apiRequest<FAQResponse>('/public/faq');
}


// =============================================================================
// Florist API Methods
// =============================================================================

import type {
  FloristMeResponse,
  FloristDeliveriesListResponse,
  FloristDelivery,
  UpdateDeliveryStatusRequest,
} from '@bloom/shared';

/**
 * Get florist profile with assigned properties.
 * Requires FLORIST role authentication.
 * Returns florist info including assigned properties.
 */
export async function getFloristMe(): Promise<FloristMeResponse> {
  return apiRequest<FloristMeResponse>('/florist/me');
}

/**
 * Get upcoming deliveries for florist's assigned properties.
 * Requires FLORIST role authentication.
 * Returns SCHEDULED deliveries ordered by date ascending.
 */
export async function getFloristDeliveries(): Promise<FloristDeliveriesListResponse> {
  return apiRequest<FloristDeliveriesListResponse>('/florist/deliveries');
}

/**
 * Update delivery status (DELIVERED or MISSED).
 * Requires FLORIST role authentication.
 * Florist must be assigned to the delivery's property.
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: 'DELIVERED' | 'MISSED'
): Promise<FloristDelivery> {
  return apiRequest<FloristDelivery>(`/florist/deliveries/${deliveryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status } as UpdateDeliveryStatusRequest),
  });
}


// =============================================================================
// Property Manager API Methods
// =============================================================================

/**
 * PM Property info
 */
export interface PMPropertyInfo {
  id: string;
  name: string;
  address: string;
  delivery_cadence: string | null;
}

/**
 * PM dashboard stats response
 */
export interface PMStatsResponse {
  property: PMPropertyInfo | null;
  total_residents: number;
  active_subscriptions: number;
  paused_subscriptions: number;
  pending_activations: number;
}

/**
 * Resident info for PM dashboard
 */
export interface ResidentInfo {
  id: string;
  email: string;
  unit: string | null;
  subscription_status: 'CREATED' | 'ACTIVE' | 'PAUSED';
  subscription_plan: string | null;
}

/**
 * PM residents list response
 */
export interface PMResidentsResponse {
  property_name: string | null;
  residents: ResidentInfo[];
}

/**
 * Get property manager dashboard statistics.
 * Requires PROPERTY_MANAGER role authentication.
 */
export async function getPMStats(): Promise<PMStatsResponse> {
  return apiRequest<PMStatsResponse>('/pm/stats');
}

/**
 * Get list of residents at the property manager's property.
 * Requires PROPERTY_MANAGER role authentication.
 */
export async function getPMResidents(): Promise<PMResidentsResponse> {
  return apiRequest<PMResidentsResponse>('/pm/residents');
}
