/**
 * Admin Properties Page - List and manage properties with enriched data.
 * Supports row selection with contextual actions for editing and assignments.
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminTable, AddModal } from '@/components';
import { AssignFloristModal } from '@/components/AssignFloristModal';
import { AssignPMModal } from '@/components/AssignPMModal';
import { EditPropertyModal } from '@/components/EditPropertyModal';
import type { Column, FieldConfig } from '@/components';
import type { EnrichedProperty, CreatePropertyRequest } from '@bloom/shared';
import { PropertyStatus } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

/**
 * Human-readable labels for property status values
 */
const STATUS_LABELS: Record<string, string> = {
  [PropertyStatus.CREATED]: 'Created',
  [PropertyStatus.PENDING_FLORIST]: 'Pending - Needs Florist',
  [PropertyStatus.PENDING_PM]: 'Pending - Needs PM',
  [PropertyStatus.ACTIVE]: 'Active',
};

/**
 * Tailwind CSS classes for status badge colors
 */
const STATUS_COLORS: Record<string, string> = {
  [PropertyStatus.CREATED]: 'bg-gray-100 text-gray-800',
  [PropertyStatus.PENDING_FLORIST]: 'bg-yellow-100 text-yellow-800',
  [PropertyStatus.PENDING_PM]: 'bg-orange-100 text-orange-800',
  [PropertyStatus.ACTIVE]: 'bg-green-100 text-green-800',
};

const PROPERTY_FIELDS: FieldConfig[] = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Property name' },
  { name: 'address', label: 'Address', type: 'text', required: true, placeholder: 'Full address' },
  { name: 'delivery_cadence', label: 'Delivery Cadence', type: 'text', required: false, placeholder: 'e.g., weekly, bi-weekly' },
];

export function PropertiesPage() {
  const [properties, setProperties] = useState<EnrichedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selection state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  
  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [assignFloristModalOpen, setAssignFloristModalOpen] = useState(false);
  const [assignPMModalOpen, setAssignPMModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Get selected property object
  const selectedProperty = properties.find(p => p.id === selectedPropertyId) || null;

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiRequest<EnrichedProperty[]>('/admin/properties');
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleCreate = async (formData: Record<string, string>) => {
    setModalError(null);
    try {
      const request: CreatePropertyRequest = {
        name: formData.name,
        address: formData.address,
        delivery_cadence: formData.delivery_cadence || undefined,
      };
      await apiRequest<EnrichedProperty>('/admin/properties', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      await fetchProperties();
      setAddModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create property');
      throw err;
    }
  };

  const handleRefresh = async () => {
    await fetchProperties();
  };

  const columns: Column<EnrichedProperty>[] = [
    { key: 'name', header: 'Name' },
    { key: 'address', header: 'Address' },
    { 
      key: 'total_users', 
      header: 'Total Users',
      render: (value) => value ?? 0
    },
    { 
      key: 'active_users', 
      header: 'Active Users',
      render: (value) => value ?? 0
    },
    { 
      key: 'florist_name', 
      header: 'Florist Assigned',
      render: (value) => value || '—'
    },
    { 
      key: 'property_manager_email', 
      header: 'Property Manager',
      render: (value) => value || '—'
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[value as string] || 'bg-gray-100 text-gray-800'}`}>
          {STATUS_LABELS[value as string] || value}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (value) => new Date(value as string).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with dynamic action bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">Properties</h1>
          {selectedProperty && (
            <span className="text-sm text-gray-500">
              Selected: <span className="font-medium text-gray-700">{selectedProperty.name}</span>
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          {selectedProperty ? (
            <>
              <button
                onClick={() => setEditModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ✏️ Edit Property
              </button>
              <button
                onClick={() => setAssignFloristModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                🌸 Assign Florist
              </button>
              <button
                onClick={() => setAssignPMModalOpen(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                👤 Assign PM
              </button>
            </>
          ) : (
            <button
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              ➕ Add Property
            </button>
          )}
        </div>
      </div>

      {/* Table with selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <AdminTable
          columns={columns}
          data={properties}
          loading={loading}
          error={error}
          keyField="id"
          selectable={true}
          selectedId={selectedPropertyId}
          onSelect={setSelectedPropertyId}
        />
      </div>

      {/* Add Property Modal */}
      <AddModal
        title="Add Property"
        fields={PROPERTY_FIELDS}
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setModalError(null);
        }}
        onSubmit={handleCreate}
        error={modalError}
      />

      {/* Edit Property Modal */}
      {selectedProperty && (
        <EditPropertyModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          property={selectedProperty}
          onSuccess={handleRefresh}
        />
      )}

      {/* Assign Florist Modal */}
      {selectedProperty && (
        <AssignFloristModal
          isOpen={assignFloristModalOpen}
          onClose={() => setAssignFloristModalOpen(false)}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          currentFloristName={selectedProperty.florist_name}
          onSuccess={handleRefresh}
        />
      )}

      {/* Assign PM Modal */}
      {selectedProperty && (
        <AssignPMModal
          isOpen={assignPMModalOpen}
          onClose={() => setAssignPMModalOpen(false)}
          propertyId={selectedProperty.id}
          propertyName={selectedProperty.name}
          currentPMEmail={selectedProperty.property_manager_email}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
