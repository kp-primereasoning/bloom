/**
 * Property Manager Overview Page
 *
 * Displays property information and subscription statistics dashboard.
 */

import { useState, useEffect } from 'react';
import { getPMStats, type PMStatsResponse } from '@/lib/api';

export function OverviewPage() {
  const [stats, setStats] = useState<PMStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPMStats();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
              <p className="text-gray-500 text-sm">Loading dashboard...</p>
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

  // No property assigned
  if (!stats?.property) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Overview</h1>
          <p className="text-gray-500 mb-6">
            Your property management dashboard.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <p className="text-amber-800 font-medium">No Property Assigned</p>
            <p className="text-amber-700 text-sm mt-1">
              Contact Bloom admin to be assigned to a property.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const participationRate = stats.total_residents > 0
    ? Math.round((stats.active_subscriptions / stats.total_residents) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Property Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Overview</h1>
        <p className="text-gray-500">
          Subscription metrics for your property.
        </p>
      </div>

      {/* Property Info Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-sm p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-100 text-sm font-medium">Your Property</p>
            <h2 className="text-2xl font-bold mt-1">{stats.property.name}</h2>
            <p className="text-indigo-100 mt-2">{stats.property.address}</p>
          </div>
          {stats.property.delivery_cadence && (
            <div className="bg-white/20 rounded-lg px-3 py-1">
              <p className="text-sm font-medium">{stats.property.delivery_cadence}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Residents */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Residents</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_residents}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.active_subscriptions}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Paused */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Paused</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.paused_subscriptions}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Activation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Activation</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.pending_activations}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Participation Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Participation Rate</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${participationRate}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {participationRate}%
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {stats.active_subscriptions} of {stats.total_residents} residents have active subscriptions
        </p>
      </div>
    </div>
  );
}
