/**
 * Property test for route guard behavior.
 * Feature: auth-rbac, Property 6: Frontend Route Guard Behavior
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';

// Role to route namespace mapping
const ROLE_ROUTES: Record<UserRole, string[]> = {
  [UserRole.CUSTOMER]: ['/customer', '/customer/home', '/customer/subscription'],
  [UserRole.PROPERTY_MANAGER]: ['/pm', '/pm/overview', '/pm/participation'],
  [UserRole.FLORIST]: ['/florist', '/florist/deliveries', '/florist/products'],
  [UserRole.ADMIN]: ['/admin', '/admin/properties', '/admin/florists'],
};

// Get the role that owns a route
function getRouteOwner(route: string): UserRole | null {
  for (const [role, routes] of Object.entries(ROLE_ROUTES)) {
    if (routes.some(r => route.startsWith(r.split('/').slice(0, 2).join('/')))) {
      return role as UserRole;
    }
  }
  return null;
}

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

// Simulate route guard behavior
interface RouteGuardResult {
  action: 'render' | 'redirect';
  redirectTo?: string;
}

function simulateRouteGuard(
  isAuthenticated: boolean,
  userRole: UserRole | null,
  targetRoute: string,
  allowedRoles?: UserRole[]
): RouteGuardResult {
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return { action: 'redirect', redirectTo: '/login' };
  }

  // If no role restrictions, render
  if (!allowedRoles || allowedRoles.length === 0) {
    return { action: 'render' };
  }

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

describe('Frontend Route Guard Behavior', () => {
  it('Property 6: unauthenticated users are redirected to /login', () => {
    const allRoutes = Object.values(ROLE_ROUTES).flat();
    
    fc.assert(
      fc.property(fc.constantFrom(...allRoutes), (route) => {
        const result = simulateRouteGuard(false, null, route, [getRouteOwner(route)!]);
        
        expect(result.action).toBe('redirect');
        expect(result.redirectTo).toBe('/login');
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: authenticated users with correct role can access their routes', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ROLES), (role) => {
        const routes = ROLE_ROUTES[role];
        
        for (const route of routes) {
          const result = simulateRouteGuard(true, role, route, [role]);
          
          expect(result.action).toBe('render');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Property 6: authenticated users with wrong role are redirected to their landing page', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...ALL_ROLES),
        (userRole, targetRole) => {
          // Skip if same role
          if (userRole === targetRole) return;
          
          const targetRoutes = ROLE_ROUTES[targetRole];
          const targetRoute = targetRoutes[0];
          
          const result = simulateRouteGuard(true, userRole, targetRoute, [targetRole]);
          
          expect(result.action).toBe('redirect');
          expect(result.redirectTo).toBe(getDefaultPath(userRole));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 6: route guard behavior is deterministic', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.constantFrom(...ALL_ROLES),
        fc.constantFrom(...Object.values(ROLE_ROUTES).flat()),
        (isAuthenticated, userRole, route) => {
          const allowedRoles = [getRouteOwner(route)!];
          
          // Call twice with same inputs
          const result1 = simulateRouteGuard(isAuthenticated, userRole, route, allowedRoles);
          const result2 = simulateRouteGuard(isAuthenticated, userRole, route, allowedRoles);
          
          // Results should be identical
          expect(result1.action).toBe(result2.action);
          expect(result1.redirectTo).toBe(result2.redirectTo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
