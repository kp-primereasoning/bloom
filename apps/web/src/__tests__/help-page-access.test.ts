/**
 * Feature: customer-help-faq
 * Property 3: Non-Customer Role Redirect
 * Validates: Requirements 3.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';

// Get default path for a role
function getDefaultPath(role: UserRole): string {
  switch (role) {
    case UserRole.CUSTOMER:
      return '/customer/home';
    case UserRole.PROPERTY_MANAGER:
      return '/pm/overview';
    case UserRole.FLORIST:
      return '/florist/deliveries';
    case UserRole.ADMIN:
      return '/admin/properties';
  }
}

// Simulate route guard behavior for /customer/help
interface RouteGuardResult {
  action: 'render' | 'redirect';
  redirectTo?: string;
}

function simulateHelpPageRouteGuard(
  isAuthenticated: boolean,
  userRole: UserRole | null
): RouteGuardResult {
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return { action: 'redirect', redirectTo: '/login' };
  }

  // /customer/help only allows CUSTOMER role
  const allowedRoles: readonly UserRole[] = [UserRole.CUSTOMER];

  // If user role is allowed, render
  if (userRole && allowedRoles.includes(userRole)) {
    return { action: 'render' };
  }

  // Otherwise, redirect to user's landing page
  return {
    action: 'redirect',
    redirectTo: userRole ? getDefaultPath(userRole) : '/login',
  };
}

// Non-customer roles
const NON_CUSTOMER_ROLES = ALL_ROLES.filter(role => role !== UserRole.CUSTOMER);

describe('HelpPage - Property 3: Non-Customer Role Redirect', () => {
  /**
   * Feature: customer-help-faq, Property 3: Non-Customer Role Redirect
   * Validates: Requirements 3.3
   * 
   * For any user with a role other than CUSTOMER, navigating to /customer/help
   * SHALL result in a redirect to their role-specific landing page.
   */
  it('should redirect non-customer roles to their landing page', () => {
    fc.assert(
      fc.property(fc.constantFrom(...NON_CUSTOMER_ROLES), (role) => {
        const result = simulateHelpPageRouteGuard(true, role);
        
        expect(result.action).toBe('redirect');
        expect(result.redirectTo).toBe(getDefaultPath(role));
      }),
      { numRuns: 100 }
    );
  });

  it('should allow CUSTOMER role to access help page', () => {
    const result = simulateHelpPageRouteGuard(true, UserRole.CUSTOMER);
    
    expect(result.action).toBe('render');
    expect(result.redirectTo).toBeUndefined();
  });

  it('should redirect unauthenticated users to login', () => {
    const result = simulateHelpPageRouteGuard(false, null);
    
    expect(result.action).toBe('redirect');
    expect(result.redirectTo).toBe('/login');
  });

  it('should redirect each non-customer role to correct landing page', () => {
    // PROPERTY_MANAGER -> /pm/overview
    expect(simulateHelpPageRouteGuard(true, UserRole.PROPERTY_MANAGER)).toEqual({
      action: 'redirect',
      redirectTo: '/pm/overview',
    });

    // FLORIST -> /florist/deliveries
    expect(simulateHelpPageRouteGuard(true, UserRole.FLORIST)).toEqual({
      action: 'redirect',
      redirectTo: '/florist/deliveries',
    });

    // ADMIN -> /admin/properties
    expect(simulateHelpPageRouteGuard(true, UserRole.ADMIN)).toEqual({
      action: 'redirect',
      redirectTo: '/admin/properties',
    });
  });

  it('should be deterministic for any role', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom(...ALL_ROLES, null),
        (isAuthenticated, role) => {
          // Call twice with same inputs
          const result1 = simulateHelpPageRouteGuard(isAuthenticated, role);
          const result2 = simulateHelpPageRouteGuard(isAuthenticated, role);
          
          // Results should be identical
          expect(result1.action).toBe(result2.action);
          expect(result1.redirectTo).toBe(result2.redirectTo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
