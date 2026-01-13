/**
 * Customer Deliveries Page
 * 
 * Displays customer's upcoming and past deliveries in a modern, card-first layout.
 * Features:
 * - Header card with subscription status
 * - Next delivery card with details table
 * - Delivery history card with table
 * 
 * CRITICAL: The literal string "CREATED" must NEVER appear in the UI.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMe, getMyDeliveries } from '@/lib/api';
import { getSelectedPlan } from '@/utils/planStorage';
import { getPlanById } from '@/config/planConfig';
import type { MeResponse, MeDeliveriesResponse, Delivery, SubscriptionStatus } from '@bloom/shared';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string for the big date display
 */
function formatBigDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get display text for subscription status (never show "CREATED")
 */
function getStatusDisplayText(status: SubscriptionStatus | null): string {
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'PAUSED') return 'PAUSED';
  return 'NOT ACTIVE';
}

/**
 * Get status chip color classes
 */
function getStatusChipColor(status: SubscriptionStatus | null): string {
  if (status === 'ACTIVE') return 'bg-green-100 text-green-800';
  if (status === 'PAUSED') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
}

/**
 * Get delivery status display with color
 */
function getDeliveryStatusDisplay(status: string): { text: string; color: string } {
  switch (status) {
    case 'DELIVERED':
      return { text: 'Delivered', color: 'text-green-600' };
    case 'SCHEDULED':
      return { text: 'Scheduled', color: 'text-blue-600' };
    case 'SKIPPED':
      return { text: 'Skipped', color: 'text-gray-500' };
    case 'MISSED':
      return { text: 'Missed', color: 'text-red-600' };
    default:
      return { text: status, color: 'text-gray-600' };
  }
}

/**
 * Get plan display name from plan ID or subscription_plan
 */
function getPlanDisplayName(planId: string | null, subscriptionPlan?: string): string {
  if (planId) {
    const plan = getPlanById(planId);
    if (plan) return plan.name;
  }
  if (subscriptionPlan) {
    // Convert ESSENTIAL -> Essential, etc.
    return subscriptionPlan.charAt(0) + subscriptionPlan.slice(1).toLowerCase();
  }
  return 'Essential';
}

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
 * Header Card - Page title and subscription status
 */
function HeaderCard({ subscriptionStatus }: { subscriptionStatus: SubscriptionStatus | null }) {
  const statusText = getStatusDisplayText(subscriptionStatus);
  const statusColor = getStatusChipColor(subscriptionStatus);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
          <p className="text-gray-600 mt-1">Track upcoming and past deliveries.</p>
        </div>
        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColor}`}>
          {statusText}
        </span>
      </div>
    </Card>
  );
}

/**
 * Next Delivery Card - Shows upcoming delivery details
 */
function NextDeliveryCard({
  delivery,
  propertyName,
  subscriptionStatus,
  selectedPlanId,
}: {
  delivery: Delivery | null;
  propertyName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  selectedPlanId: string | null;
}) {
  const planName = getPlanDisplayName(selectedPlanId, delivery?.subscription_plan);
  const deliveryStatus = delivery ? getDeliveryStatusDisplay(delivery.status) : null;

  // Determine action button
  const renderActionButton = () => {
    if (subscriptionStatus === 'PAUSED') {
      return (
        <Link
          to="/customer/subscription"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Resume Subscription
        </Link>
      );
    }
    if (subscriptionStatus === 'CREATED') {
      return (
        <Link
          to="/customer/subscription"
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Activate Subscription
        </Link>
      );
    }
    // ACTIVE
    return (
      <button
        disabled
        className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
      >
        All set
      </button>
    );
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Delivery</h2>
      
      {/* Big date display */}
      <div className="mb-4">
        {delivery ? (
          <p className="text-2xl font-bold text-emerald-600">
            {formatBigDate(delivery.scheduled_for)}
          </p>
        ) : (
          <p className="text-2xl font-bold text-gray-400">Coming soon</p>
        )}
      </div>

      {/* Details table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-2 text-gray-500 font-medium w-1/3">Property</td>
              <td className="py-2 text-gray-900">{propertyName || '—'}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-500 font-medium">Delivery window</td>
              <td className="py-2 text-gray-900">9:00 AM – 5:00 PM</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-500 font-medium">Plan</td>
              <td className="py-2 text-gray-900">{planName}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-500 font-medium">Status</td>
              <td className={`py-2 font-medium ${deliveryStatus?.color || 'text-gray-400'}`}>
                {deliveryStatus?.text || 'Pending'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action button */}
      <div className="flex justify-end">
        {renderActionButton()}
      </div>
    </Card>
  );
}

/**
 * Delivery History Card - Table of past deliveries
 */
function DeliveryHistoryCard({
  history,
  selectedPlanId,
}: {
  history: Delivery[];
  selectedPlanId: string | null;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery History</h2>
      
      {history.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No deliveries yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 text-left text-gray-500 font-medium">Date</th>
                <th className="py-2 text-left text-gray-500 font-medium">Status</th>
                <th className="py-2 text-left text-gray-500 font-medium">Plan</th>
                <th className="py-2 text-left text-gray-500 font-medium">Notes</th>
                <th className="py-2 text-right text-gray-500 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((delivery) => {
                const statusDisplay = getDeliveryStatusDisplay(delivery.status);
                const planName = getPlanDisplayName(selectedPlanId, delivery.subscription_plan);
                
                return (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-900">{formatDate(delivery.scheduled_for)}</td>
                    <td className={`py-3 font-medium ${statusDisplay.color}`}>
                      {statusDisplay.text}
                    </td>
                    <td className="py-3 text-gray-900">{planName}</td>
                    <td className="py-3 text-gray-400">—</td>
                    <td className="py-3 text-right">
                      <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/**
 * Loading skeleton for the page
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-20" />
        </div>
      </div>

      {/* Next delivery skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
        <div className="space-y-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex">
              <div className="h-4 bg-gray-200 rounded w-24 mr-4" />
              <div className="h-4 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <div className="h-10 bg-gray-200 rounded w-32" />
        </div>
      </div>

      {/* History skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 rounded w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DeliveriesPage() {
  const [userData, setUserData] = useState<MeResponse | null>(null);
  const [deliveries, setDeliveries] = useState<MeDeliveriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user data and deliveries in parallel
        const [userResponse, deliveriesResponse] = await Promise.all([
          getMe(),
          getMyDeliveries(),
        ]);
        
        setUserData(userResponse);
        setDeliveries(deliveriesResponse);
        
        // Get selected plan from localStorage
        const storedPlan = getSelectedPlan();
        setSelectedPlanId(storedPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state for initial load failure
  if (error && !userData) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Deliveries</h1>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-sm text-red-600 underline hover:text-red-800"
            >
              Try again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <HeaderCard subscriptionStatus={userData?.subscription_status ?? null} />

      {/* Error message for partial failures */}
      {error && userData && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Next Delivery Card */}
      <NextDeliveryCard
        delivery={deliveries?.next_delivery ?? null}
        propertyName={userData?.property_name ?? null}
        subscriptionStatus={userData?.subscription_status ?? null}
        selectedPlanId={selectedPlanId}
      />

      {/* Delivery History Card */}
      <DeliveryHistoryCard
        history={deliveries?.history ?? []}
        selectedPlanId={selectedPlanId}
      />
    </div>
  );
}
