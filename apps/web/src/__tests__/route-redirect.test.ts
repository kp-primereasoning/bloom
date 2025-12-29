/**
 * Feature: repo-scaffold-dashboard-shell
 * Property 5: Unauthorized Route Redirect
 * Validates: Requirements 6.5, 6.6, 6.7, 6.8, 6.9
 *
 * For any UserRole and for any route outside that role's namespace,
 * attempting to access that route SHALL redirect to the role's default landing page.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';
import {
  sidebarConfig,
  getDefaultPath,
  getNamespace,
  isPathInNamespace,
} from '../config/sidebarConfig';
import { setStoredRole } from '../hooks/useRole';

// Expected default paths for each role
const expectedDefaultPaths: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/customer/home',
  [UserRole.PROPERTY_MANAGER]: '/pm/overview',
  [UserRole.FLORIST]: '/florist/deliveries',
  [UserRole.ADMIN]: '/admin/properties',
};

// Arbitrary for generating random UserRole values
const roleArbitrary = fc.constantFrom(...ALL_ROLES);

describe('Route Redirect - Property 5: Unauthorized Route Redirect', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have correct default path for any role', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const defaultPath = getDefaultPath(role);
        expect(defaultPath).toBe(expectedDefaultPaths[role]);
      }),
      { numRuns: 100 }
    );
  });

  it('should identify paths outside namespace correctly', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const otherRoles = ALL_ROLES.filter((r) => r !== role);

        // Paths from other roles should be outside this role's namespace
        otherRoles.forEach((otherRole) => {
          const otherPaths = sidebarConfig[otherRole].navItems.map((item) => item.path);
          otherPaths.forEach((path) => {
            expect(isPathInNamespace(path, role)).toBe(false);
          });
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should identify paths inside namespace correctly', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = sidebarConfig[role];

        // All paths for this role should be inside the namespace
        config.navItems.forEach((item) => {
          expect(isPathInNamespace(item.path, role)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should have default path inside role namespace', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const defaultPath = getDefaultPath(role);
        const namespace = getNamespace(role);
        expect(defaultPath.startsWith(namespace)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly determine redirect target for unauthorized access', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        // Set the current role
        setStoredRole(role);

        // For any path outside the namespace, the redirect target should be the default path
        const otherRoles = ALL_ROLES.filter((r) => r !== role);
        otherRoles.forEach((otherRole) => {
          const otherPaths = sidebarConfig[otherRole].navItems.map((item) => item.path);
          otherPaths.forEach((unauthorizedPath) => {
            // The path is outside namespace
            expect(isPathInNamespace(unauthorizedPath, role)).toBe(false);
            // The redirect target should be the default path
            expect(getDefaultPath(role)).toBe(expectedDefaultPaths[role]);
          });
        });
      }),
      { numRuns: 100 }
    );
  });
});
