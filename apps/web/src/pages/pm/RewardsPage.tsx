/**
 * Property Manager Rewards Page
 *
 * Displays rewards program information and progress.
 * Currently shows placeholder content for future rewards features.
 */

import { useState, useEffect } from 'react';
import { getPMStats, type PMStatsResponse } from '@/lib/api';

export function RewardsPage() {
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
        setError(err instanceof Error ? err.message : 'Failed to load data');
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
              <p className="text-gray-500 text-sm">Loading rewards...</p>
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

  const participationRate = stats && stats.total_residents > 0
    ? Math.round((stats.active_subscriptions / stats.total_residents) * 100)
    : 0;

  // Calculate reward tier based on participation
  const rewardTier = participationRate >= 75 ? 'Gold' : participationRate >= 50 ? 'Silver' : 'Bronze';
  const tierColor = rewardTier === 'Gold' ? 'yellow' : rewardTier === 'Silver' ? 'gray' : 'orange';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Rewards</h1>
        <p className="text-gray-500">
          Earn rewards for your property's subscription participation.
        </p>
      </div>

      {/* Current Tier Card */}
      <div className={`bg-gradient-to-r ${
        rewardTier === 'Gold' ? 'from-yellow-400 to-yellow-600' :
        rewardTier === 'Silver' ? 'from-gray-400 to-gray-600' :
        'from-orange-400 to-orange-600'
      } rounded-lg shadow-sm p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Current Tier</p>
            <h2 className="text-3xl font-bold mt-1">{rewardTier}</h2>
            <p className="text-white/80 mt-2">
              {participationRate}% participation rate
            </p>
          </div>
          <div className="p-4 bg-white/20 rounded-full">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Reward Tiers</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bronze */}
          <div className={`border rounded-lg p-6 ${
            rewardTier === 'Bronze' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Bronze</h3>
                <p className="text-sm text-gray-500">0-49% participation</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Monthly floral arrangement for lobby
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Quarterly property showcase
              </li>
            </ul>
          </div>

          {/* Silver */}
          <div className={`border rounded-lg p-6 ${
            rewardTier === 'Silver' ? 'border-gray-500 bg-gray-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gray-200 rounded-full">
                <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Silver</h3>
                <p className="text-sm text-gray-500">50-74% participation</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All Bronze benefits
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Bi-weekly lobby arrangements
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Holiday special arrangements
              </li>
            </ul>
          </div>

          {/* Gold */}
          <div className={`border rounded-lg p-6 ${
            rewardTier === 'Gold' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Gold</h3>
                <p className="text-sm text-gray-500">75%+ participation</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                All Silver benefits
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Weekly lobby arrangements
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Priority florist matching
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Featured in Bloom newsletter
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {rewardTier !== 'Gold' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Progress to Next Tier</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    rewardTier === 'Bronze' ? 'bg-orange-500' : 'bg-gray-500'
                  }`}
                  style={{
                    width: `${rewardTier === 'Bronze'
                      ? (participationRate / 50) * 100
                      : ((participationRate - 50) / 25) * 100
                    }%`
                  }}
                />
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {rewardTier === 'Bronze' ? 50 - participationRate : 75 - participationRate}% to go
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Increase participation to {rewardTier === 'Bronze' ? '50%' : '75%'} to reach{' '}
            {rewardTier === 'Bronze' ? 'Silver' : 'Gold'} tier!
          </p>
        </div>
      )}
    </div>
  );
}
