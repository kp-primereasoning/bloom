import { UserRole } from '@bloom/shared';
import type { NavItem, RoleConfig } from '@bloom/shared';

/**
 * Sidebar configuration for each user role
 * Defines navigation items, route namespaces, and default landing pages
 */
export const sidebarConfig: Record<UserRole, RoleConfig> = {
  [UserRole.CUSTOMER]: {
    role: UserRole.CUSTOMER,
    namespace: '/customer',
    defaultPath: '/customer/home',
    navItems: [
      { label: 'Home', path: '/customer/home' },
      { label: 'My Subscription', path: '/customer/subscription' },
      { label: 'Deliveries', path: '/customer/deliveries' },
      { label: 'Account', path: '/customer/account' },
    ],
  },
  [UserRole.PROPERTY_MANAGER]: {
    role: UserRole.PROPERTY_MANAGER,
    namespace: '/pm',
    defaultPath: '/pm/overview',
    navItems: [
      { label: 'Overview', path: '/pm/overview' },
      { label: 'Participation', path: '/pm/participation' },
      { label: 'Rewards', path: '/pm/rewards' },
      { label: 'Settings', path: '/pm/settings' },
    ],
  },
  [UserRole.FLORIST]: {
    role: UserRole.FLORIST,
    namespace: '/florist',
    defaultPath: '/florist/deliveries',
    navItems: [
      { label: 'Upcoming Deliveries', path: '/florist/deliveries' },
      { label: 'Product Mapping', path: '/florist/products' },
      { label: 'Availability', path: '/florist/availability' },
      { label: 'Settings', path: '/florist/settings' },
    ],
  },
  [UserRole.ADMIN]: {
    role: UserRole.ADMIN,
    namespace: '/admin',
    defaultPath: '/admin/properties',
    navItems: [
      { label: 'Properties', path: '/admin/properties' },
      { label: 'Florists', path: '/admin/florists' },
      { label: 'Assignments', path: '/admin/assignments' },
      { label: 'Exceptions', path: '/admin/exceptions' },
    ],
  },
};

/**
 * Get the configuration for a specific role
 */
export function getRoleConfig(role: UserRole): RoleConfig {
  return sidebarConfig[role];
}

/**
 * Get the default landing path for a role
 */
export function getDefaultPath(role: UserRole): string {
  return sidebarConfig[role].defaultPath;
}

/**
 * Get the namespace for a role
 */
export function getNamespace(role: UserRole): string {
  return sidebarConfig[role].namespace;
}

/**
 * Check if a path belongs to a role's namespace
 */
export function isPathInNamespace(path: string, role: UserRole): boolean {
  const namespace = getNamespace(role);
  return path.startsWith(namespace);
}

// Re-export types for convenience
export type { NavItem, RoleConfig };
