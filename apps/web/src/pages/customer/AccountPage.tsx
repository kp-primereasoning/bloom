/**
 * Customer Account Page
 * 
 * Displays customer profile, address/building info, and billing placeholder.
 * Features:
 * - Profile card with email and member since date
 * - Address card with building name, address, and unit
 * - Billing placeholder with disabled buttons
 * - Change address modal for updating property/unit
 * 
 * CRITICAL: No subscription UI should appear on this page.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, listProperties, updateMyProperty } from '@/lib/api';
import type { MeResponse, PropertyListItem } from '@bloom/shared';

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Card wrapper component for consistent styling
 */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * Format date for display (e.g., "January 15, 2025")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format address with optional unit number
 */
function formatAddressWithUnit(address: string | null, unit: string | null): string {
  if (!address) return 'Not available';
  if (!unit) return address;
  return `${address}, Unit ${unit}`;
}

/**
 * Loading skeleton for the page
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile card skeleton */}
      <Card className="p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="flex">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-48 ml-8" />
          </div>
          <div className="flex">
            <div className="h-4 bg-gray-200 rounded w-28" />
            <div className="h-4 bg-gray-200 rounded w-36 ml-8" />
          </div>
        </div>
      </Card>

      {/* Address card skeleton */}
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
        <div className="space-y-3 mb-4">
          <div className="flex">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-40 ml-8" />
          </div>
          <div className="flex">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-56 ml-8" />
          </div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-32" />
      </Card>

      {/* Billing card skeleton */}
      <Card className="p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-20 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-44" />
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </Card>
    </div>
  );
}

/**
 * Change Address Modal
 * Modal for changing property/unit with building dropdown and unit input
 */
function ChangeAddressModal({ 
  isOpen, 
  onClose,
  currentPropertyId,
  currentUnit,
  onSave
}: { 
  isOpen: boolean; 
  onClose: () => void;
  currentPropertyId: string | null;
  currentUnit: string | null;
  onSave: () => void;
}) {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(currentPropertyId || '');
  const [unit, setUnit] = useState<string>(currentUnit || '');
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the selected property details
  const selectedProperty = properties.find(p => p.id === selectedPropertyId);

  // Load properties when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingProperties(true);
      setError(null);
      setSelectedPropertyId(currentPropertyId || '');
      setUnit(currentUnit || '');
      
      listProperties()
        .then(setProperties)
        .catch(err => setError(err instanceof Error ? err.message : 'Failed to load properties'))
        .finally(() => setIsLoadingProperties(false));
    }
  }, [isOpen, currentPropertyId, currentUnit]);

  // Handle building change - clear unit when building changes
  const handleBuildingChange = (newPropertyId: string) => {
    setSelectedPropertyId(newPropertyId);
    // Clear unit when building changes (unless it's the same building)
    if (newPropertyId !== currentPropertyId) {
      setUnit('');
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedPropertyId || !unit.trim()) {
      setError('Please select a building and enter your unit number');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateMyProperty({ property_id: selectedPropertyId, unit: unit.trim() });
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update address');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if save should be disabled
  const isSaveDisabled = !selectedPropertyId || !unit.trim() || isSaving;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Address</h2>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            {/* Building Dropdown */}
            <div>
              <label htmlFor="building-select" className="block text-sm font-medium text-gray-700 mb-1">
                Building
              </label>
              {isLoadingProperties ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : (
                <select
                  id="building-select"
                  value={selectedPropertyId}
                  onChange={(e) => handleBuildingChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a building</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Address (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                value={selectedProperty?.address || ''}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Select a building to see address"
              />
            </div>

            {/* Unit (Editable, Required) */}
            <div>
              <label htmlFor="unit-input" className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                id="unit-input"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., 4B, 101, 2A"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Required to save your address</p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaveDisabled}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AccountPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChangeAddressModalOpen, setIsChangeAddressModalOpen] = useState(false);

  // Fetch user data
  const fetchUserData = async () => {
    try {
      const data = await getMe();
      setUserData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // Handle address save - refresh user data
  const handleAddressSave = () => {
    fetchUserData();
  };

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !userData) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        </Card>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error || 'Failed to load account data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Account</h1>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-gray-600 w-1/3">Email</td>
              <td className="py-2 text-gray-900">{userData.email}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-600 w-1/3">Member since</td>
              <td className="py-2 text-gray-900">{formatDate(userData.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Address Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Address</h2>
        <table className="w-full">
          <tbody>
            <tr>
              <td className="py-2 text-gray-600 w-1/3">Building</td>
              <td className="py-2 text-gray-900">
                {userData.property_name || 'Not selected'}
              </td>
            </tr>
            {userData.property_id && (
              <tr>
                <td className="py-2 text-gray-600 w-1/3">Address</td>
                <td className="py-2 text-gray-900">
                  {formatAddressWithUnit(userData.property_address, userData.unit)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* CTA based on property_id */}
        <div className="mt-4">
          {userData.property_id ? (
            <button
              onClick={() => setIsChangeAddressModalOpen(true)}
              className="text-blue-600 hover:underline"
            >
              Change address
            </button>
          ) : (
            <button
              onClick={() => navigate('/onboarding/property')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Select your building
            </button>
          )}
        </div>
      </Card>

      {/* Billing Card (Placeholder) */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing</h2>
        <p className="text-gray-600 mb-4">
          Billing is coming soon. You'll manage payment methods and invoices here.
        </p>
        <div className="flex gap-3">
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
          >
            Update payment method
          </button>
          <button
            disabled
            className="px-4 py-2 bg-gray-100 text-gray-400 rounded cursor-not-allowed"
          >
            View invoices
          </button>
        </div>
      </Card>

      {/* Change Address Modal */}
      <ChangeAddressModal
        isOpen={isChangeAddressModalOpen}
        onClose={() => setIsChangeAddressModalOpen(false)}
        currentPropertyId={userData.property_id}
        currentUnit={userData.unit}
        onSave={handleAddressSave}
      />
    </div>
  );
}
