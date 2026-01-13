/**
 * Florist Settings Page
 * 
 * Displays florist profile information, status, and assigned properties.
 * Shows onboarding steps for store setup and Shopify integration.
 */

import { useState, useEffect } from 'react';
import { getFloristMe } from '@/lib/api';
import { OnboardingSteps } from '@/components/OnboardingSteps';
import type { FloristMeResponse, AssignedProperty } from '@bloom/shared';

/**
 * Get badge color for florist status
 */
function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'ONBOARDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'ARCHIVED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function SettingsPage() {
  const [floristData, setFloristData] = useState<FloristMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch florist profile on mount
  useEffect(() => {
    async function fetchFloristProfile() {
      try {
        setLoading(true);
        setError(null);
        const response = await getFloristMe();
        setFloristData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchFloristProfile();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
              <p className="text-gray-500 text-sm">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Steps Section */}
      <OnboardingSteps />

      {/* Business Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500 mb-6">
          Manage your florist account and view your assignments.
        </p>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Business Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Business Name
              </label>
              <p className="text-lg text-gray-900">{floristData?.florist_name}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Status
              </label>
              <span
                className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeColor(
                  floristData?.florist_status || ''
                )}`}
              >
                {floristData?.florist_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Properties Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Assigned Properties</h2>
        <p className="text-gray-500 mb-6">
          Properties you are currently assigned to fulfill deliveries for.
        </p>

        {floristData?.assigned_properties && floristData.assigned_properties.length > 0 ? (
          <div className="space-y-4">
            {floristData.assigned_properties.map((property: AssignedProperty) => (
              <div
                key={property.property_id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <h3 className="font-medium text-gray-900">{property.property_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{property.property_address}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-500">No properties assigned yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Contact Bloom admin to get assigned to properties.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
