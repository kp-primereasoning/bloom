/**
 * Property Manager Rewards Page
 *
 * Displays rewards program information and progress using backend-computed
 * tier data from GET /pm/rewards. Tier computation is server-side to ensure
 * consistency and auditability.
 */

import { useState, useEffect } from 'react';
import { getPMRewards, type PMRewardsResponse } from '@/lib/api';

export function RewardsPage() {
  const [rewards, setRewards] = useState<PMRewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRewards() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPMRewards();
        setRewards(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rewards');
      } finally {
        setLoading(false);
      }
    }
    fetchRewards();
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

  // Empty state (no rewards data)
  if (!rewards) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Rewards</h1>
          <p className="text-gray-500">No rewards data available.</p>
        </div>
      </div>
    );
  }

  const { current, tier_definitions } = rewards;

  const tierGradient = current.tier === 'Gold'
    ? 'from-yellow-400 to-yellow-600'
    : current.tier === 'Silver'
      ? 'from-gray-400 to-gray-600'
      : 'from-orange-400 to-orange-600';

  const tierProgressColor = current.tier === 'Gold'
    ? 'bg-yellow-500'
    : current.tier === 'Silver'
      ? 'bg-gray-500'
      : 'bg-orange-500';

  const tierBorderStyles: Record<string, { active: string; icon: string }> = {
    Bronze: { active: 'border-orange-500 bg-orange-50', icon: 'bg-orange-100 text-orange-600' },
    Silver: { active: 'border-gray-500 bg-gray-50', icon: 'bg-gray-200 text-gray-600' },
    Gold: { active: 'border-yellow-500 bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600' },
  };

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
      <div className={`bg-gradient-to-r ${tierGradient} rounded-lg shadow-sm p-6 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm font-medium">Current Tier</p>
            <h2 className="text-3xl font-bold mt-1">{current.tier}</h2>
            <p className="text-white/80 mt-2">
              {Math.round(current.participation_rate)}% participation rate
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
          {tier_definitions.map((tierDef) => {
            const isActive = tierDef.name === current.tier;
            const styles = tierBorderStyles[tierDef.name] ?? { active: 'border-gray-500 bg-gray-50', icon: 'bg-gray-200 text-gray-600' };
            const rateLabel = tierDef.max_rate != null
              ? `${tierDef.min_rate}-${tierDef.max_rate}% participation`
              : `${tierDef.min_rate}%+ participation`;

            return (
              <div
                key={tierDef.name}
                className={`border rounded-lg p-6 ${isActive ? styles.active : 'border-gray-200'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${styles.icon}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tierDef.name}</h3>
                    <p className="text-sm text-gray-500">{rateLabel}</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-600">
                  {tierDef.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress to Next Tier */}
      {current.next_tier && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Progress to Next Tier</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${tierProgressColor}`}
                  style={{ width: `${Math.round(current.progress_to_next * 100)}%` }}
                />
              </div>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {current.threshold_for_next != null
                ? `${current.threshold_for_next - Math.round(current.participation_rate)}% to go`
                : ''}
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Increase participation to {current.threshold_for_next}% to reach {current.next_tier} tier!
          </p>
        </div>
      )}
    </div>
  );
}
