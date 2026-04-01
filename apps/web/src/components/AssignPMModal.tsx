/**
 * Modal for assigning a property manager to a property.
 */

import { useState, useEffect, type FormEvent } from 'react';
import type { User } from '@bloom/shared';
import { apiRequest } from '@/lib/api';

interface AssignPMModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  currentPMEmail?: string | null;
  onSuccess: () => void;
}

export function AssignPMModal({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  currentPMEmail,
  onSuccess,
}: AssignPMModalProps) {
  const [propertyManagers, setPropertyManagers] = useState<User[]>([]);
  const [selectedPMId, setSelectedPMId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPropertyManagers();
    }
  }, [isOpen]);

  const fetchPropertyManagers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<User[]>('/admin/users?role=PROPERTY_MANAGER');
      setPropertyManagers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load property managers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPMId) return;

    setSubmitting(true);
    setError(null);
    try {
      await apiRequest(`/admin/properties/${propertyId}/assign-pm`, {
        method: 'PATCH',
        body: JSON.stringify({ user_id: selectedPMId }),
      });
      setSelectedPMId('');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign property manager');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedPMId('');
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Assign Property Manager</h2>
          <p className="text-sm text-gray-600 mb-4">
            Property: <span className="font-medium">{propertyName}</span>
          </p>
          
          {currentPMEmail && (
            <p className="text-sm text-gray-500 mb-4">
              Currently assigned: <span className="font-medium">{currentPMEmail}</span>
            </p>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label 
                htmlFor="pm"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Property Manager <span className="text-red-500">*</span>
              </label>
              
              {loading ? (
                <p className="text-sm text-gray-500">Loading property managers...</p>
              ) : propertyManagers.length === 0 ? (
                <p className="text-sm text-yellow-600">No property managers found. Create a user with PROPERTY_MANAGER role first.</p>
              ) : (
                <select
                  id="pm"
                  required
                  value={selectedPMId}
                  onChange={(e) => setSelectedPMId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-bloom-sage focus:border-bloom-sage"
                >
                  <option value="">Select a property manager</option>
                  {propertyManagers.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.email}
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
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedPMId}
                className="px-4 py-2 text-sm font-medium text-white bg-bloom-dark border border-transparent rounded-md hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Assigning...' : 'Assign PM'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
