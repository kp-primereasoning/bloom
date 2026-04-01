/**
 * Florist Deliveries Page
 * 
 * Displays upcoming deliveries for the florist's assigned properties.
 * Allows marking deliveries as delivered or missed.
 */

import { useState, useEffect } from 'react';
import { getFloristDeliveries, updateDeliveryStatus } from '@/lib/api';
import type { FloristDelivery } from '@bloom/shared';
import { SubscriptionPlan } from '@bloom/shared';

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
 * Get badge color for subscription plan
 */
function getPlanBadgeColor(plan: string): string {
  switch (plan) {
    case SubscriptionPlan.ESSENTIAL:
      return 'bg-gray-100 text-gray-800';
    case SubscriptionPlan.SIGNATURE:
      return 'bg-blue-100 text-blue-800';
    case SubscriptionPlan.STATEMENT:
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<FloristDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch deliveries on mount
  useEffect(() => {
    async function fetchDeliveries() {
      try {
        setLoading(true);
        setError(null);
        const response = await getFloristDeliveries();
        setDeliveries(response.deliveries);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load deliveries');
      } finally {
        setLoading(false);
      }
    }
    fetchDeliveries();
  }, []);

  // Handle marking delivery as delivered
  const handleMarkDelivered = async (deliveryId: string) => {
    try {
      setActionLoading(deliveryId);
      setActionError(null);
      await updateDeliveryStatus(deliveryId, 'DELIVERED');
      // Remove from list on success
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as delivered');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle marking delivery as missed
  const handleMarkMissed = async (deliveryId: string) => {
    try {
      setActionLoading(deliveryId);
      setActionError(null);
      await updateDeliveryStatus(deliveryId, 'MISSED');
      // Remove from list on success
      setDeliveries((prev) => prev.filter((d) => d.id !== deliveryId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to mark as missed');
    } finally {
      setActionLoading(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bloom-sage" />
            <p className="text-gray-500 text-sm">Loading deliveries...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Upcoming Deliveries</h1>
      <p className="text-gray-500 mb-6">
        View and manage your upcoming floral delivery assignments.
      </p>

      {/* Action error message */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" role="alert">
          <p className="text-red-700">{actionError}</p>
        </div>
      )}

      {/* Empty state */}
      {deliveries.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No upcoming deliveries scheduled.</p>
        </div>
      ) : (
        /* Deliveries table */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(delivery.scheduled_for)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {delivery.property_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {delivery.property_address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.customer_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPlanBadgeColor(
                        delivery.subscription_plan
                      )}`}
                    >
                      {delivery.subscription_plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleMarkDelivered(delivery.id)}
                        disabled={actionLoading === delivery.id}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-bloom-dark hover:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === delivery.id ? (
                          <span className="flex items-center gap-1">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            ...
                          </span>
                        ) : (
                          'Mark Delivered'
                        )}
                      </button>
                      <button
                        onClick={() => handleMarkMissed(delivery.id)}
                        disabled={actionLoading === delivery.id}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-bloom-sage disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mark Missed
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
