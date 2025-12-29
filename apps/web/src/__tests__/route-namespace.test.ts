/**
 * Feature: repo-scaffold-dashboard-shell
 * Property 4: Route Namespace Consistency
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 *
 * For any UserRole, all routes accessible to that role SHALL be prefixed
 * with the role's designated namespace (/customer, /pm, /florist, /admin).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';
import { sidebarConfig, getNamespace } from '../config/sidebarConfig';

// Expected namespaces for each role
const expectedNamespaces: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/customer',
  [UserRole.PROPERTY_MANAGER]: '/pm',
  [UserRole.FLORIST]: '/florist',
  [UserRole.ADMIN]: '/admin',
};

// Arbitrary for generating random UserRole values
const roleArbitrary = fc.constantFrom(...ALL_ROLES);

describe('Route Namespace - Property 4: Route Namespace Consistency', () => {
  it('should have correct namespace for any role', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const namespace = getNamespace(role);
        expect(namespace).toBe(expectedNamespaces[role]);
      }),
      { numRuns: 100 }
    );
  });

  it('should have all nav item paths prefixed with role namespace', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = sidebarConfig[role];
        const namespace = config.namespace;

        // Every nav item path should start with the namespace
        config.navItems.forEach((item) => {
          expect(item.path.startsWith(namespace)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should have default path within role namespace', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = sidebarConfig[role];
        expect(config.defaultPath.startsWith(config.namespace)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should have unique namespaces for each role', () => {
    const namespaces = ALL_ROLES.map((role) => getNamespace(role));
    const uniqueNamespaces = new Set(namespaces);
    expect(uniqueNamespaces.size).toBe(ALL_ROLES.length);
  });

  it('should not have overlapping namespaces', () => {
    fc.assert(
      fc.property(
        fc.tuple(roleArbitrary, roleArbitrary).filter(([r1, r2]) => r1 !== r2),
        ([role1, role2]) => {
          const ns1 = getNamespace(role1);
          const ns2 = getNamespace(role2);

          // Neither namespace should be a prefix of the other
          expect(ns1.startsWith(ns2)).toBe(false);
          expect(ns2.startsWith(ns1)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
