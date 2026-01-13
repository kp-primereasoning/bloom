/**
 * Authentication types for the Bloom platform
 */

import { UserRole } from './roles';

/**
 * Authenticated user information
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  property_id: string | null;
  subscription_status: 'CREATED' | 'ACTIVE' | 'PAUSED' | null;
  subscription_plan: 'ESSENTIAL' | 'SIGNATURE' | 'STATEMENT' | null;
  created_at?: string;
}

/**
 * Authentication state for the frontend
 */
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Login request credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login response from the API
 */
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/**
 * Standard error response format
 */
export interface AuthError {
  code: string;
  message: string;
  request_id: string;
}

/**
 * API error response envelope
 */
export interface ApiErrorResponse {
  error: AuthError;
}
