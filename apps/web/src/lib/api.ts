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
  LoginResponse,
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
 * Exchange a Cognito authorization code for tokens and user info.
 * Public endpoint - no authentication required.
 */
export async function exchangeAuthCode(code: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/cognito/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

/**
 * Submit a waitlist entry for a building not yet on Bloom.
 * Requires authentication.
 */
export async function submitWaitlistEntry(data: {
  building_name: string;
  building_address: string;
}): Promise<{ id: string; message: string }> {
  return apiRequest<{ id: string; message: string }>('/auth/waitlist', {
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
  next_delivery_date: string | null;
  upcoming_delivery_count: number;
  participation_rate: number;
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
 * Plan distribution breakdown by tier
 */
export interface PlanDistribution {
  essential: number;
  signature: number;
  statement: number;
}

/**
 * PM residents list response
 */
export interface PMResidentsResponse {
  property_name: string | null;
  residents: ResidentInfo[];
  plan_distribution: PlanDistribution;
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


// =============================================================================
// PM Deliveries API
// =============================================================================

/**
 * Single delivery record for PM delivery history
 */
export interface PMDeliveryItem {
  id: string;
  resident_email: string;
  unit: string | null;
  subscription_plan: string;
  status: string;
  scheduled_for: string;
  delivered_at: string | null;
}

/**
 * Aggregated delivery counts by status
 */
export interface DeliverySummary {
  delivered: number;
  skipped: number;
  missed: number;
  scheduled: number;
}

/**
 * PM deliveries response with pagination and summary
 */
export interface PMDeliveriesResponse {
  deliveries: PMDeliveryItem[];
  summary: DeliverySummary;
  total: number;
  page: number;
  page_size: number;
}

/**
 * Query parameters for PM deliveries endpoint
 */
export interface PMDeliveriesParams {
  page?: number;
  page_size?: number;
  status?: string;
}

/**
 * Get delivery history for the property manager's property.
 * Requires PROPERTY_MANAGER role authentication.
 * Supports pagination and optional status filtering.
 */
export async function getPMDeliveries(params?: PMDeliveriesParams): Promise<PMDeliveriesResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page !== undefined) searchParams.set('page', String(params.page));
  if (params?.page_size !== undefined) searchParams.set('page_size', String(params.page_size));
  if (params?.status) searchParams.set('status', params.status);
  const query = searchParams.toString();
  return apiRequest<PMDeliveriesResponse>(`/pm/deliveries${query ? `?${query}` : ''}`);
}


// =============================================================================
// PM Rewards API
// =============================================================================

/**
 * Current reward tier information for a property
 */
export interface RewardTierInfo {
  tier: string;
  participation_rate: number;
  benefits: string[];
  next_tier: string | null;
  progress_to_next: number;
  threshold_for_next: number | null;
}

/**
 * Definition of a reward tier with thresholds and benefits
 */
export interface TierDefinition {
  name: string;
  min_rate: number;
  max_rate: number | null;
  benefits: string[];
}

/**
 * PM rewards response
 */
export interface PMRewardsResponse {
  current: RewardTierInfo;
  tier_definitions: TierDefinition[];
}

/**
 * Get rewards tier for the property manager's property.
 * Requires PROPERTY_MANAGER role authentication.
 */
export async function getPMRewards(): Promise<PMRewardsResponse> {
  return apiRequest<PMRewardsResponse>('/pm/rewards');
}


// =============================================================================
// PM Settings API
// =============================================================================

/**
 * Notification preference toggles
 */
export interface NotificationPreferences {
  delivery_reminders: boolean;
  participation_updates: boolean;
  rewards_milestones: boolean;
}

/**
 * PM settings response with profile info and notification preferences
 */
export interface PMSettingsResponse {
  email: string;
  property_name: string | null;
  property_address: string | null;
  notifications: NotificationPreferences;
}

/**
 * Request body for updating PM settings
 */
export interface PMSettingsUpdate {
  notifications: NotificationPreferences;
}

/**
 * Get property manager profile and notification preferences.
 * Requires PROPERTY_MANAGER role authentication.
 */
export async function getPMSettings(): Promise<PMSettingsResponse> {
  return apiRequest<PMSettingsResponse>('/pm/settings');
}

/**
 * Update property manager notification preferences.
 * Requires PROPERTY_MANAGER role authentication.
 */
export async function updatePMSettings(data: PMSettingsUpdate): Promise<PMSettingsResponse> {
  return apiRequest<PMSettingsResponse>('/pm/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}


// =============================================================================
// Payment API Methods
// =============================================================================

export interface SetupIntentResponse {
  client_secret: string;
  setup_intent_id: string;
}

export interface SubscribeRequest {
  plan: string;
}

export interface SubscribeResponse {
  subscription_id: string;
  status: string;
  client_secret: string | null;
}

export interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface InvoiceItem {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  period_start: number | null;
  period_end: number | null;
  pdf_url: string | null;
  created: number | null;
}

/**
 * Create a Stripe SetupIntent for collecting a payment method.
 * Requires CUSTOMER role authentication.
 */
export async function createSetupIntent(): Promise<SetupIntentResponse> {
  return apiRequest<SetupIntentResponse>('/payments/setup-intent', { method: 'POST' });
}

/**
 * Create a Stripe Subscription for the selected plan.
 * Requires CUSTOMER role authentication.
 */
export async function createSubscription(plan: string): Promise<SubscribeResponse> {
  return apiRequest<SubscribeResponse>('/payments/subscribe', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/**
 * Cancel the current Stripe Subscription.
 * Requires CUSTOMER role authentication.
 */
export async function cancelSubscription(): Promise<{ subscription_id: string; status: string }> {
  return apiRequest('/payments/cancel', { method: 'POST' });
}

/**
 * Get the customer's current payment method on file.
 * Requires CUSTOMER role authentication.
 */
export async function getPaymentMethod(): Promise<PaymentMethodInfo | null> {
  return apiRequest<PaymentMethodInfo | null>('/payments/payment-method');
}

/**
 * Update the customer's default payment method.
 * Requires CUSTOMER role authentication.
 */
export async function updatePaymentMethod(paymentMethodId: string): Promise<PaymentMethodInfo> {
  return apiRequest<PaymentMethodInfo>('/payments/payment-method', {
    method: 'PATCH',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

/**
 * List the customer's invoices from Stripe.
 * Requires CUSTOMER role authentication.
 */
export async function getInvoices(): Promise<InvoiceItem[]> {
  return apiRequest<InvoiceItem[]>('/payments/invoices');
}


// =============================================================================
// Notification Preferences API Methods
// =============================================================================

export interface UserNotificationPreferences {
  email_notifications_enabled: boolean;
}

/**
 * Get current user's notification preferences.
 * Requires CUSTOMER or FLORIST role authentication.
 */
export async function getNotificationPreferences(): Promise<UserNotificationPreferences> {
  return apiRequest<UserNotificationPreferences>('/me/notification-preferences');
}

/**
 * Update current user's notification preferences.
 * Requires CUSTOMER or FLORIST role authentication.
 */
export async function updateNotificationPreferences(
  data: UserNotificationPreferences
): Promise<UserNotificationPreferences> {
  return apiRequest<UserNotificationPreferences>('/me/notification-preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}


// =============================================================================
// Florist Availability API Methods
// =============================================================================

export interface DayAvailability {
  day_of_week: number;
  is_available: boolean;
  max_deliveries_per_day: number;
}

export interface AvailabilityResponse {
  days: DayAvailability[];
}

/**
 * Get florist's current availability for each day of the week.
 * Requires FLORIST role authentication.
 */
export async function getFloristAvailability(): Promise<AvailabilityResponse> {
  return apiRequest<AvailabilityResponse>('/florist/availability');
}

/**
 * Bulk update florist availability for all days.
 * Requires FLORIST role authentication.
 */
export async function updateFloristAvailability(
  days: DayAvailability[]
): Promise<AvailabilityResponse> {
  return apiRequest<AvailabilityResponse>('/florist/availability', {
    method: 'PUT',
    body: JSON.stringify({ days }),
  });
}
