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
