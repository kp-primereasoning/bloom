/**
 * User roles in the Bloom platform
 */
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROPERTY_MANAGER = 'PROPERTY_MANAGER',
  FLORIST = 'FLORIST',
  ADMIN = 'ADMIN',
}

/**
 * Array of all user roles for iteration
 */
export const ALL_ROLES = Object.values(UserRole);
