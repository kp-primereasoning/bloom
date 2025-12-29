/**
 * Modal for editing property details.
 */

import { useState, useEffect, type FormEvent } from 'react';
import type { EnrichedProperty, UpdatePropertyRequest } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

interface EditPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: EnrichedProperty;
  onSuccess: () => void;
}

export function EditPropertyModal({
  isOpen,
  onClose,
  property,
  onSuccess,
}: EditPropertyModalProps) {
  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address);
  const [deliveryCadence, setDeliveryCadence] = useState(property.delivery_cadence || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when property changes
  useEffect(() => {
    setName(property.name);
    setAddress(property.address);
    setDeliveryCadence(property.delivery_cadence || '');
    setError(null);
  }, [property]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    setError(null);
    try {
      const request: UpdatePropertyRequest = {
        name,
        address,
        delivery_cadence: deliveryCadence || undefined,
      };
      await apiRequest(`/admin/properties/${property.id}`, {
        method: 'PATCH',
        body: JSON.stringify(request),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName(property.name);
    setAddress(property.address);
    setDeliveryCadence(property.delivery_cadence || '');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={handleClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Property</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label 
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label 
                  htmlFor="deliveryCadence"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Delivery Cadence
                </label>
                <input
                  id="deliveryCadence"
                  type="text"
                  value={deliveryCadence}
                  onChange={(e) => setDeliveryCadence(e.target.value)}
                  placeholder="e.g., weekly, bi-weekly"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
