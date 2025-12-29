/**
 * User roles in the Bloom platform
 */
export const UserRole = {
  CUSTOMER: 'CUSTOMER',
  PROPERTY_MANAGER: 'PROPERTY_MANAGER',
  FLORIST: 'FLORIST',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * Array of all user roles for iteration
 */
export const ALL_ROLES = Object.values(UserRole);
