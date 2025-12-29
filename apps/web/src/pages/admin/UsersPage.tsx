/**
 * Admin Users Page - List and manage users.
 * 
 * Enhanced with:
 * - Property column (shows property_name for PMs)
 * - Subscription Status column (for CUSTOMER users)
 * - Inline role dropdown for updates
 * - Inline subscription status dropdown for CUSTOMER users
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminTable, AddModal } from '@/components';
import type { Column, FieldConfig } from '@/components';
import type { AdminUser, CreateUserRequest, UpdateUserRequest, EnrichedProperty } from '@bloom/shared';
import { ALL_ROLES, ALL_SUBSCRIPTION_STATUSES } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [properties, setProperties] = useState<EnrichedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('CUSTOMER');

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<AdminUser[]>('/admin/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const data = await apiRequest<EnrichedProperty[]>('/admin/properties');
      setProperties(data);
    } catch (err) {
      console.error('Failed to load properties:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchProperties();
  }, [fetchUsers, fetchProperties]);

  // Build dynamic fields based on selected role
  const getModalFields = (): FieldConfig[] => {
    const baseFields: FieldConfig[] = [
      { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'user@example.com' },
      { 
        name: 'role', 
        label: 'Role', 
        type: 'select', 
        required: true,
        options: ALL_ROLES.map((role) => ({ value: role, label: role.replace('_', ' ') })),
      },
      { name: 'password', label: 'Password', type: 'password', required: true, placeholder: 'Min 6 characters' },
    ];

    // Add property selector for PROPERTY_MANAGER
    if (selectedRole === 'PROPERTY_MANAGER') {
      baseFields.push({
        name: 'property_id',
        label: 'Property (Optional)',
        type: 'select',
        required: false,
        options: [
          { value: '', label: 'No property assigned' },
          ...properties.map((p) => ({ value: p.id, label: p.name })),
        ],
      });
    }

    // Show subscription status info for CUSTOMER role
    if (selectedRole === 'CUSTOMER') {
      baseFields.push({
        name: 'subscription_status_info',
        label: 'Subscription Status',
        type: 'info',
        required: false,
        infoText: 'CREATED (default for new customers)',
      });
    }

    return baseFields;
  };

  const handleCreate = async (formData: Record<string, string>) => {
    setModalError(null);
    try {
      const request: CreateUserRequest = {
        email: formData.email,
        role: formData.role as CreateUserRequest['role'],
        password: formData.password,
      };
      
      // Add property_id if provided and role is PROPERTY_MANAGER
      if (formData.property_id && formData.role === 'PROPERTY_MANAGER') {
        request.property_id = formData.property_id;
      }
      
      const newUser = await apiRequest<AdminUser>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setUsers((prev) => [...prev, newUser]);
      setModalOpen(false);
      setSelectedRole('CUSTOMER');
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create user');
      throw err;
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const request: UpdateUserRequest = { role: newRole as UpdateUserRequest['role'] };
      const updatedUser = await apiRequest<AdminUser>(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(request),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleSubscriptionStatusChange = async (userId: string, newStatus: string) => {
    try {
      const request: UpdateUserRequest = { subscription_status: newStatus as UpdateUserRequest['subscription_status'] };
      const updatedUser = await apiRequest<AdminUser>(`/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(request),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subscription status');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'PROPERTY_MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'FLORIST':
        return 'bg-green-100 text-green-800';
      case 'CUSTOMER':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubscriptionBadgeColor = (status: string | null) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CREATED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-50 text-gray-400';
    }
  };

  const columns: Column<AdminUser>[] = [
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (value, row) => (
        <select
          value={value as string}
          onChange={(e) => handleRoleChange(row.id, e.target.value)}
          className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getRoleBadgeColor(value as string)}`}
        >
          {ALL_ROLES.map((role) => (
            <option key={role} value={role}>
              {role.replace('_', ' ')}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'property_name' as keyof AdminUser,
      header: 'Property',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {(value as string | null) || '-'}
        </span>
      ),
    },
    {
      key: 'subscription_status' as keyof AdminUser,
      header: 'Subscription',
      render: (value, row) => {
        if (row.role !== 'CUSTOMER') {
          return <span className="text-sm text-gray-400">-</span>;
        }
        return (
          <select
            value={(value as string) || 'CREATED'}
            onChange={(e) => handleSubscriptionStatusChange(row.id, e.target.value)}
            className={`px-2 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${getSubscriptionBadgeColor(value as string | null)}`}
          >
            {ALL_SUBSCRIPTION_STATUSES.map((status: string) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          ➕ Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <AdminTable
          columns={columns}
          data={users}
          loading={loading}
          error={null}
          keyField="id"
        />
      </div>

      <AddModal
        title="Add User"
        fields={getModalFields()}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalError(null);
          setSelectedRole('CUSTOMER');
        }}
        onSubmit={handleCreate}
        error={modalError}
        onFieldChange={(name, value) => {
          if (name === 'role') {
            setSelectedRole(value);
          }
        }}
      />
    </div>
  );
}
