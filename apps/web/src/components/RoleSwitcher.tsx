/**
 * Dev role switcher component.
 * Only available in development mode.
 * Uses backend endpoint to get real JWT for selected role.
 */

import { useState } from 'react';
import { UserRole, ALL_ROLES } from '@bloom/shared';
import { useAuth } from '@/providers/AuthProvider';
import { apiRequest, setAuthToken } from '@/lib/api';
import type { LoginResponse } from '@bloom/shared';

const roleLabels: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: 'Customer',
  [UserRole.PROPERTY_MANAGER]: 'Property Manager',
  [UserRole.FLORIST]: 'Florist',
  [UserRole.ADMIN]: 'Admin',
};

export function RoleSwitcher() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Only show in development mode
  if (import.meta.env.PROD) {
    return null;
  }

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === user?.role) return;
    
    setIsLoading(true);
    try {
      // Get new JWT from backend dev endpoint
      const response = await apiRequest<LoginResponse>(
        '/auth/dev/switch-role',
        {
          method: 'POST',
          body: JSON.stringify({ role: newRole }),
        }
      );

      // Store new token
      setAuthToken(response.access_token);
      
      // Reload to reset all state with new role
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 uppercase tracking-wide">Dev Role:</span>
      <select
        value={user?.role || ''}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        disabled={isLoading}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
        aria-label="Select role"
      >
        {ALL_ROLES.map((role) => (
          <option key={role} value={role}>
            {roleLabels[role]}
          </option>
        ))}
      </select>
      {isLoading && <span className="text-xs text-gray-400">Switching...</span>}
    </div>
  );
}
