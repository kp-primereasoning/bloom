/**
 * Property Manager Settings Page
 *
 * Displays PM profile information and assigned property details.
 */

import { useState, useEffect } from 'react';
import { getPMStats, type PMStatsResponse } from '@/lib/api';

export function SettingsPage() {
  const [data, setData] = useState<PMStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        const response = await getPMStats();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
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
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500">
          Manage your property manager account settings.
        </p>
      </div>

      {/* Property Assignment */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Property Assignment</h2>
        <p className="text-gray-500 mb-6">
          The property you are assigned to manage.
        </p>

        {data?.property ? (
          <div className="border border-indigo-200 rounded-lg p-6 bg-indigo-50/30">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{data.property.name}</h3>
                <p className="text-gray-600 mt-1">{data.property.address}</p>
                {data.property.delivery_cadence && (
                  <div className="mt-3">
                    <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {data.property.delivery_cadence} Deliveries
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-800 font-medium">No Property Assigned</p>
            <p className="text-amber-700 text-sm mt-1">
              Contact Bloom admin to be assigned to a property.
            </p>
          </div>
        )}
      </div>

      {/* Account Stats */}
      {data?.property && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Property Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.total_residents}</p>
              <p className="text-sm text-gray-500">Total Residents</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{data.active_subscriptions}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{data.paused_subscriptions}</p>
              <p className="text-sm text-gray-500">Paused</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{data.pending_activations}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h2>
        <p className="text-gray-500 mb-6">
          Configure how you receive updates about your property.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">New Resident Sign-ups</p>
              <p className="text-sm text-gray-500">Get notified when a resident joins the program</p>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Enabled
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Weekly Summary</p>
              <p className="text-sm text-gray-500">Receive a weekly report of participation metrics</p>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Enabled
            </div>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-gray-900">Reward Tier Changes</p>
              <p className="text-sm text-gray-500">Get notified when your property reaches a new tier</p>
            </div>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Enabled
            </div>
          </div>
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Notification settings will be customizable in a future update. All notifications are currently enabled by default.
          </p>
        </div>
      </div>
    </div>
  );
}
