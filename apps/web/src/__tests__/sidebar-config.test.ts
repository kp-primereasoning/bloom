/**
 * Feature: repo-scaffold-dashboard-shell
 * Property 1: Sidebar Configuration Correctness
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * For any valid UserRole, the sidebar configuration SHALL return exactly
 * the nav items specified for that role, with correct labels and paths.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';
import { sidebarConfig, getRoleConfig, getNamespace, isPathInNamespace } from '../config/sidebarConfig';

// Expected nav items for each role (ground truth from requirements)
const expectedNavItems: Record<UserRole, { label: string; path: string }[]> = {
  [UserRole.CUSTOMER]: [
    { label: 'Home', path: '/customer/home' },
    { label: 'My Subscription', path: '/customer/subscription' },
    { label: 'Deliveries', path: '/customer/deliveries' },
    { label: 'Account', path: '/customer/account' },
  ],
  [UserRole.PROPERTY_MANAGER]: [
    { label: 'Overview', path: '/pm/overview' },
    { label: 'Participation', path: '/pm/participation' },
    { label: 'Rewards', path: '/pm/rewards' },
    { label: 'Settings', path: '/pm/settings' },
  ],
  [UserRole.FLORIST]: [
    { label: 'Upcoming Deliveries', path: '/florist/deliveries' },
    { label: 'Product Mapping', path: '/florist/products' },
    { label: 'Availability', path: '/florist/availability' },
    { label: 'Settings', path: '/florist/settings' },
  ],
  [UserRole.ADMIN]: [
    { label: 'Properties', path: '/admin/properties' },
    { label: 'Florists', path: '/admin/florists' },
    { label: 'Assignments', path: '/admin/assignments' },
    { label: 'Exceptions', path: '/admin/exceptions' },
  ],
};

// Expected namespaces for each role
const expectedNamespaces: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/customer',
  [UserRole.PROPERTY_MANAGER]: '/pm',
  [UserRole.FLORIST]: '/florist',
  [UserRole.ADMIN]: '/admin',
};

// Expected default paths for each role
const expectedDefaultPaths: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: '/customer/home',
  [UserRole.PROPERTY_MANAGER]: '/pm/overview',
  [UserRole.FLORIST]: '/florist/deliveries',
  [UserRole.ADMIN]: '/admin/properties',
};

// Arbitrary for generating random UserRole values
const roleArbitrary = fc.constantFrom(...ALL_ROLES);

describe('Sidebar Configuration - Property 1: Sidebar Configuration Correctness', () => {
  it('should return correct nav items for any role', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = getRoleConfig(role);
        const expected = expectedNavItems[role];

        // Check that we have the correct number of nav items
        expect(config.navItems).toHaveLength(expected.length);

        // Check that each nav item matches expected
        config.navItems.forEach((item, index) => {
          expect(item.label).toBe(expected[index].label);
          expect(item.path).toBe(expected[index].path);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should return correct namespace for any role', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const namespace = getNamespace(role);
        expect(namespace).toBe(expectedNamespaces[role]);
      }),
      { numRuns: 100 }
    );
  });

  it('should return correct default path for any role', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = getRoleConfig(role);
        expect(config.defaultPath).toBe(expectedDefaultPaths[role]);
      }),
      { numRuns: 100 }
    );
  });

  it('should have all nav item paths within the role namespace', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        const config = getRoleConfig(role);
        const namespace = getNamespace(role);

        // Every nav item path should start with the role's namespace
        config.navItems.forEach((item) => {
          expect(item.path.startsWith(namespace)).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly identify paths within namespace', () => {
    fc.assert(
      fc.property(roleArbitrary, fc.string(), (role, suffix) => {
        const namespace = getNamespace(role);
        const pathInNamespace = `${namespace}/${suffix}`;
        const pathOutsideNamespace = `/other/${suffix}`;

        expect(isPathInNamespace(pathInNamespace, role)).toBe(true);
        expect(isPathInNamespace(pathOutsideNamespace, role)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
