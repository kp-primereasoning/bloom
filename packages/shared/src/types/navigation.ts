import { UserRole } from './roles';

/**
 * Navigation item in the sidebar
 */
export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

/**
 * Configuration for a user role including routes and navigation
 */
export interface RoleConfig {
  role: UserRole;
  namespace: string;
  defaultPath: string;
  navItems: NavItem[];
}
