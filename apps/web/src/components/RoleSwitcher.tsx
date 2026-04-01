/**
 * Dev role switcher component.
 * Only available in development mode.
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

  if (import.meta.env.PROD) return null;

  const handleRoleChange = async (newRole: UserRole) => {
    if (newRole === user?.role) return;
    setIsLoading(true);
    try {
      const response = await apiRequest<LoginResponse>('/auth/dev/switch-role', {
        method: 'POST',
        body: JSON.stringify({ role: newRole }),
      });
      setAuthToken(response.access_token);
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch role:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-[0.6875rem] text-stone-400 uppercase tracking-wide">Dev:</span>
      <select
        value={user?.role || ''}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        disabled={isLoading}
        className="text-[0.8125rem] border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-bloom-sage/30 focus:border-bloom-sage disabled:opacity-50"
        aria-label="Select role"
      >
        {ALL_ROLES.map((role) => (
          <option key={role} value={role}>{roleLabels[role]}</option>
        ))}
      </select>
      {isLoading && <span className="text-[0.6875rem] text-stone-400">Switching...</span>}
    </div>
  );
}
