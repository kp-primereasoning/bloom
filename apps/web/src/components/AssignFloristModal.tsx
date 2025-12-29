/**
 * Modal for assigning a florist to a property.
 */

import { useState, useEffect, type FormEvent } from 'react';
import type { Florist } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

interface AssignFloristModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  currentFloristName?: string | null;
  onSuccess: () => void;
}

export function AssignFloristModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  currentFloristName,
  onSuccess,
}: AssignFloristModalProps) {
  const [florists, setFlorists] = useState<Florist[]>([]);
  const [selectedFloristId, setSelectedFloristId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFlorists();
    }
  }, [isOpen]);

  const fetchFlorists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<Florist[]>('/admin/florists');
      setFlorists(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load florists');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFloristId) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest('/admin/property-assignments', {
        method: 'POST',
        body: JSON.stringify({
          property_id: propertyId,
          florist_id: selectedFloristId,
        }),
      });
      setSelectedFloristId('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign florist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedFloristId('');
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Assign Florist</h2>
          <p className="text-sm text-gray-600 mb-4">
            Property: <span className="font-medium">{propertyName}</span>
          </p>
          
          {currentFloristName && (
            <p className="text-sm text-gray-500 mb-4">
              Currently assigned: <span className="font-medium">{currentFloristName}</span>
            </p>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="florist"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Florist <span className="text-red-500">*</span>
              </label>
              
              {loading ? (
                <p className="text-sm text-gray-500">Loading florists...</p>
              ) : (
                <select
                  id="florist"
                  required
                  value={selectedFloristId}
                  onChange={(e) => setSelectedFloristId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a florist</option>
                  {florists.map((florist) => (
                    <option key={florist.id} value={florist.id}>
                      {florist.name} ({florist.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedFloristId}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign Florist'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
