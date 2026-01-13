/**
 * Onboarding route guard component.
 * Handles routing logic for the customer onboarding flow.
 */

import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';

interface OnboardingGuardProps {
  children: ReactNode;
}

/**
 * Get the landing page for a given role
 */
function getRoleLandingPage(role: string): string {
  const landingPages: Record<string, string> = {
    ADMIN: '/admin',
    PROPERTY_MANAGER: '/pm',
    FLORIST: '/florist',
    CUSTOMER: '/customer',
  };
  return landingPages[role] || '/';
}

/**
 * OnboardingGuard handles routing for the onboarding flow:
 * - Unauthenticated users can only access /onboarding/register
 * - Non-CUSTOMER roles are redirected to their role landing page
 * - CUSTOMER users are routed based on their onboarding state:
 *   - No property_id → /onboarding/property
 *   - subscription_status === CREATED → /onboarding/subscription
 *   - Otherwise → /customer dashboard
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }
  
  // Unauthenticated: only allow /onboarding/register
  if (!isAuthenticated) {
    if (location.pathname !== '/onboarding/register') {
      return <Navigate to="/onboarding/register" replace />;
    }
    return <>{children}</>;
  }
  
  // Non-CUSTOMER: redirect to role landing page
  if (user?.role !== 'CUSTOMER') {
    return <Navigate to={getRoleLandingPage(user?.role || '')} replace />;
  }
  
  // CUSTOMER routing based on onboarding state
  const currentPath = location.pathname;
  
  // No property selected yet
  if (!user.property_id) {
    if (currentPath !== '/onboarding/property' && currentPath !== '/onboarding/register') {
      return <Navigate to="/onboarding/property" replace />;
    }
    return <>{children}</>;
  }
  
  // Property selected but subscription not activated
  if (user.subscription_status === 'CREATED') {
    if (currentPath !== '/onboarding/subscription') {
      return <Navigate to="/onboarding/subscription" replace />;
    }
    return <>{children}</>;
  }
  
  // Fully onboarded (ACTIVE or PAUSED) - redirect to dashboard
  return <Navigate to="/customer" replace />;
}
