/**
 * Customer Dashboard v1
 * Shows subscription status, property info, next delivery placeholder,
 * and contextual action buttons for pause/resume subscription.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { getMe, updateMySubscription } from '@/lib/api';
import type { MeResponse } from '@bloom/shared';

export function HomePage() {
  const { refreshUser } = useAuth();
  const [userData, setUserData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch enriched user data on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const data = await getMe();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);

  // Handle pause subscription
  const handlePauseSubscription = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      const updated = await updateMySubscription({ subscription_status: 'PAUSED' });
      setUserData(updated);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause subscription');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle resume subscription
  const handleResumeSubscription = async () => {
    setIsActionLoading(true);
    setError(null);
    try {
      const updated = await updateMySubscription({ subscription_status: 'ACTIVE' });
      setUserData(updated);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Status badge colors
  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    CREATED: 'bg-gray-100 text-gray-800',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  // Derive state for action buttons
  const needsProperty = !userData?.property_id;
  const needsActivation = userData?.subscription_status === 'CREATED';
  const isActive = userData?.subscription_status === 'ACTIVE';
  const isPaused = userData?.subscription_status === 'PAUSED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome to Bloom</h1>
        <p className="text-gray-600">Your floral subscription dashboard</p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Property card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Your Property
          </h3>
          {userData?.property_name ? (
            <div className="font-medium text-gray-900">{userData.property_name}</div>
          ) : (
            <div className="text-gray-500">—</div>
          )}
        </div>

        {/* Subscription status card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Subscription
          </h3>
          <span
            className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${
              statusColors[userData?.subscription_status || 'CREATED'] || statusColors.CREATED
            }`}
          >
            {userData?.subscription_status || 'Not Set'}
          </span>
        </div>

        {/* Next delivery card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Next Delivery
          </h3>
          <div className="text-gray-500">Coming soon</div>
        </div>
      </div>

      {/* Action section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Actions
        </h3>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Contextual action buttons */}
        <div className="flex flex-wrap gap-3">
          {needsProperty && (
            <Link
              to="/onboarding/property"
              className="inline-flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700"
            >
              Select your building
            </Link>
          )}

          {!needsProperty && needsActivation && (
            <Link
              to="/onboarding/subscription"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
            >
              Activate subscription
            </Link>
          )}

          {isActive && (
            <button
              onClick={handlePauseSubscription}
              disabled={isActionLoading}
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionLoading ? 'Pausing...' : 'Pause subscription'}
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResumeSubscription}
              disabled={isActionLoading}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionLoading ? 'Resuming...' : 'Resume subscription'}
            </button>
          )}
        </div>

        {/* Status-specific messages */}
        {isActive && (
          <p className="mt-4 text-sm text-gray-600">
            Your subscription is active. Fresh flowers are on the way!
          </p>
        )}
        {isPaused && (
          <p className="mt-4 text-sm text-gray-600">
            Your subscription is paused. Resume anytime to continue deliveries.
          </p>
        )}
      </div>
    </div>
  );
}
