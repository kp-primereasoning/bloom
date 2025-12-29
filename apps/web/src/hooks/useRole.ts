import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '@bloom/shared';

const STORAGE_KEY = 'bloom_dev_role';
const DEFAULT_ROLE = UserRole.CUSTOMER;

/**
 * Hook for managing the current user role
 * Persists to localStorage for development role switching
 */
export function useRole() {
  const [role, setRoleState] = useState<UserRole>(() => {
    // Initialize from localStorage or default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && Object.values(UserRole).includes(stored as UserRole)) {
        return stored as UserRole;
      }
    }
    return DEFAULT_ROLE;
  });

  // Sync to localStorage when role changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, role);
  }, [role]);

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
  }, []);

  return { role, setRole };
}

/**
 * Get the stored role from localStorage (for use outside React)
 */
export function getStoredRole(): UserRole {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && Object.values(UserRole).includes(stored as UserRole)) {
      return stored as UserRole;
    }
  }
  return DEFAULT_ROLE;
}

/**
 * Set the role in localStorage (for use outside React)
 */
export function setStoredRole(role: UserRole): void {
  localStorage.setItem(STORAGE_KEY, role);
}
