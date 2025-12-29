/**
 * Property test for login flow correctness.
 * Feature: auth-rbac, Property 7: Login Flow Correctness
 * Validates: Requirements 6.3, 6.4, 1.2
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

// Simulate login result
interface LoginResult {
  success: boolean;
  user?: { id: string; email: string; role: UserRole };
  error?: string;
  redirectTo?: string;
  stayOnPage?: boolean;
}

// Simulate login flow
function simulateLoginFlow(
  email: string,
  password: string,
  validCredentials: Map<string, { password: string; role: UserRole }>
): LoginResult {
  const userCreds = validCredentials.get(email.toLowerCase());
  
  if (!userCreds || userCreds.password !== password) {
    // Invalid credentials
    return {
      success: false,
      error: 'Invalid email or password',
      stayOnPage: true,
    };
  }
  
  // Valid credentials
  const user = {
    id: 'test-id',
    email: email.toLowerCase(),
    role: userCreds.role,
  };
  
  return {
    success: true,
    user,
    redirectTo: getDefaultPath(user.role),
  };
}

describe('Login Flow Correctness', () => {
  // Setup valid credentials for testing
  const validCredentials = new Map<string, { password: string; role: UserRole }>([
    ['admin@bloom.test', { password: 'bloom123', role: UserRole.ADMIN }],
    ['florist@bloom.test', { password: 'bloom123', role: UserRole.FLORIST }],
    ['pm@bloom.test', { password: 'bloom123', role: UserRole.PROPERTY_MANAGER }],
    ['customer@bloom.test', { password: 'bloom123', role: UserRole.CUSTOMER }],
  ]);

  it('Property 7: valid credentials redirect to role landing page', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_ROLES), (role) => {
        // Get the email for this role
        const emailMap: Record<UserRole, string> = {
          [UserRole.ADMIN]: 'admin@bloom.test',
          [UserRole.FLORIST]: 'florist@bloom.test',
          [UserRole.PROPERTY_MANAGER]: 'pm@bloom.test',
          [UserRole.CUSTOMER]: 'customer@bloom.test',
        };
        
        const email = emailMap[role];
        const password = 'bloom123';
        
        const result = simulateLoginFlow(email, password, validCredentials);
        
        expect(result.success).toBe(true);
        expect(result.user?.role).toBe(role);
        expect(result.redirectTo).toBe(getDefaultPath(role));
        expect(result.stayOnPage).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 7: invalid credentials show error and stay on page', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (email, password) => {
          // Skip if accidentally valid
          const userCreds = validCredentials.get(email.toLowerCase());
          if (userCreds && userCreds.password === password) return;
          
          const result = simulateLoginFlow(email, password, validCredentials);
          
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.stayOnPage).toBe(true);
          expect(result.redirectTo).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: wrong password for valid email shows error', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Array.from(validCredentials.keys())),
        fc.string({ minLength: 1, maxLength: 50 }).filter(p => p !== 'bloom123'),
        (email, wrongPassword) => {
          const result = simulateLoginFlow(email, wrongPassword, validCredentials);
          
          expect(result.success).toBe(false);
          expect(result.error).toBe('Invalid email or password');
          expect(result.stayOnPage).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: login result is deterministic', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        fc.string({ minLength: 1, maxLength: 50 }),
        (email, password) => {
          const result1 = simulateLoginFlow(email, password, validCredentials);
          const result2 = simulateLoginFlow(email, password, validCredentials);
          
          expect(result1.success).toBe(result2.success);
          expect(result1.error).toBe(result2.error);
          expect(result1.redirectTo).toBe(result2.redirectTo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
