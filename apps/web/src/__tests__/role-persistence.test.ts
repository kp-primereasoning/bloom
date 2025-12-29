/**
 * Feature: repo-scaffold-dashboard-shell
 * Property 3: Role Persistence Round-Trip
 * Validates: Requirements 5.3, 5.4
 *
 * For any UserRole stored via the Role_Switcher, reloading the application
 * SHALL restore that same role from localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { UserRole, ALL_ROLES } from '@bloom/shared';
import { getStoredRole, setStoredRole } from '../hooks/useRole';

// Arbitrary for generating random UserRole values
const roleArbitrary = fc.constantFrom(...ALL_ROLES);

describe('Role Persistence - Property 3: Role Persistence Round-Trip', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should persist and restore any role from localStorage (round-trip)', () => {
    fc.assert(
      fc.property(roleArbitrary, (role) => {
        // Store the role
        setStoredRole(role);

        // Retrieve the role (simulating app reload)
        const retrievedRole = getStoredRole();

        // Should get back the same role
        expect(retrievedRole).toBe(role);
      }),
      { numRuns: 100 }
    );
  });

  it('should default to CUSTOMER when localStorage is empty', () => {
    localStorage.clear();
    const role = getStoredRole();
    expect(role).toBe(UserRole.CUSTOMER);
  });

  it('should default to CUSTOMER when localStorage has invalid value', () => {
    localStorage.setItem('bloom_dev_role', 'INVALID_ROLE');
    const role = getStoredRole();
    expect(role).toBe(UserRole.CUSTOMER);
  });

  it('should handle multiple role changes correctly', () => {
    fc.assert(
      fc.property(fc.array(roleArbitrary, { minLength: 1, maxLength: 10 }), (roles) => {
        // Apply each role change in sequence
        roles.forEach((role) => {
          setStoredRole(role);
        });

        // The final stored role should be the last one in the sequence
        const finalRole = getStoredRole();
        expect(finalRole).toBe(roles[roles.length - 1]);
      }),
      { numRuns: 100 }
    );
  });
});
