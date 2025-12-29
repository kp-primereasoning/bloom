/**
 * Authentication context provider for the Bloom platform.
 * Manages auth state, login/logout, and token persistence.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, AuthState, LoginCredentials, LoginResponse } from '@bloom/shared';
import { apiRequest, setAuthToken, clearAuthToken, getAuthToken } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Fetch current user from /auth/me
  const fetchCurrentUser = useCallback(async () => {
    try {
      const user = await apiRequest<User>('/auth/me');
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Token is invalid or expired
      clearAuthToken();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  // Restore auth state on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [fetchCurrentUser]);

  // Login function - returns user for immediate redirect
  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    const response = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token
    setAuthToken(response.access_token);

    // Update state with user from response
    setState({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });

    // Return user for immediate redirect (avoids race condition)
    return response.user;
  }, []);

  // Logout function
  const logout = useCallback(() => {
    clearAuthToken();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
