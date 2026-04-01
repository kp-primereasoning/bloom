/**
 * Admin Florists Page - List and manage florists.
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminTable, AddModal } from '@/components';
import type { Column, FieldConfig } from '@/components';
import type { Florist, CreateFloristRequest } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

const FLORIST_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Florist business name' },
];

export function FloristsPage() {
  const [florists, setFlorists] = useState<Florist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchFlorists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<Florist[]>('/admin/florists');
      setFlorists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load florists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlorists();
  }, [fetchFlorists]);

  const handleCreate = async (formData: Record<string, string>) => {
    setModalError(null);
    try {
      const request: CreateFloristRequest = {
        name: formData.name,
      };
      const newFlorist = await apiRequest<Florist>('/admin/florists', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      setFlorists((prev) => [...prev, newFlorist]);
      setModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create florist');
      throw err;
    }
  };

  const columns: Column<Florist>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'READY' 
            ? 'bg-bloom-sage/15 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value as string}
        </span>
      ),
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
        <h1 className="text-2xl font-semibold text-gray-900">Florists</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-bloom-dark border border-transparent rounded-md hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage"
        >
          ➕ Add Florist
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <AdminTable
          columns={columns}
          data={florists}
          loading={loading}
          error={error}
          keyField="id"
        />
      </div>

      <AddModal
        title="Add Florist"
        fields={FLORIST_FIELDS}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalError(null);
        }}
        onSubmit={handleCreate}
        error={modalError}
      />
    </div>
  );
}
