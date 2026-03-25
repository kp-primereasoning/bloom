/**
 * Customer Subscription Page
 * 
 * Displays subscription plans as cards and allows customers to:
 * - Activate a subscription (from CREATED status)
 * - Pause/Resume their subscription
 * - Switch between plans
 * 
 * CRITICAL: The literal string "CREATED" must NEVER appear in the UI.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { getMe, updateMySubscription, updateMyPlan, getPaymentMethod, createSubscription } from '@/lib/api';
import { PlanCard, type PlanAction } from '@/components/PlanCard';
import { getAllPlans, DEFAULT_PLAN_ID } from '@/config/planConfig';
import { getStatusDisplay } from '@/utils/subscriptionStatus';
import type { MeResponse, SubscriptionPlan } from '@bloom/shared';

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  
  const [userData, setUserData] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const plans = getAllPlans();

  // Fetch user data on mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        const data = await getMe();
        setUserData(data);

        // Initialize selected plan from API response or default
        setSelectedPlanId(data.subscription_plan || DEFAULT_PLAN_ID);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, []);

  // Handle plan actions
  const handleAction = async (action: PlanAction) => {
    setIsActionLoading(true);
    setError(null);

    try {
      switch (action.type) {
        case 'activate': {
          // Check if user has a payment method on file before activating
          try {
            const pm = await getPaymentMethod();
            if (!pm) {
              // No payment method — redirect to billing page to set one up
              navigate('/customer/billing', { state: { returnTo: '/customer/subscription', needsPaymentMethod: true } });
              return;
            }
          } catch {
            // If payment check fails (e.g. Stripe not configured), proceed anyway
          }

          // Save plan choice first
          await updateMyPlan({ plan: action.planId as SubscriptionPlan });
          setSelectedPlanId(action.planId);

          // Create Stripe subscription for recurring billing
          try {
            await createSubscription(action.planId);
          } catch {
            // If Stripe isn't configured, still allow activation for dev/testing
          }

          const updated = await updateMySubscription({ subscription_status: 'ACTIVE' });
          setUserData(updated);
          await refreshUser();

          // Redirect to dashboard after successful activation
          navigate('/customer/home');
          break;
        }

        case 'pause': {
          const updated = await updateMySubscription({ subscription_status: 'PAUSED' });
          setUserData(updated);
          await refreshUser();
          break;
        }

        case 'resume': {
          const updated = await updateMySubscription({ subscription_status: 'ACTIVE' });
          setUserData(updated);
          await refreshUser();
          break;
        }

        case 'switch': {
          // Save selected plan to backend
          const updated = await updateMyPlan({ plan: action.planId as SubscriptionPlan });
          setSelectedPlanId(action.planId);
          setUserData(updated);
          await refreshUser();
          break;
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Get status display configuration
  const statusDisplay = getStatusDisplay(userData?.subscription_status ?? null);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
              <div className="space-y-2 mb-6">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="h-10 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state for initial load failure
  if (!userData && error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
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

  // Determine if a plan should be marked as current
  // Only show "current plan" badge if subscription is ACTIVE or PAUSED
  const isSubscriptionStarted = userData?.subscription_status === 'ACTIVE' || userData?.subscription_status === 'PAUSED';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600 mt-1">{statusDisplay.subheader}</p>
        </div>
        
        {/* Status pill - only shown for ACTIVE or PAUSED */}
        {statusDisplay.showPill && statusDisplay.pillText && (
          <span
            className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusDisplay.pillColor}`}
          >
            {statusDisplay.pillText}
          </span>
        )}
      </div>

      {/* Error message for actions */}
      {error && userData && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Plan cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentPlan={isSubscriptionStarted && selectedPlanId === plan.id}
            subscriptionStatus={userData?.subscription_status ?? null}
            onAction={handleAction}
            isLoading={isActionLoading}
          />
        ))}
      </div>

      {/* Property info */}
      {userData?.property_name && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            Deliveries will be made to{' '}
            <span className="font-medium text-gray-900">{userData.property_name}</span>
          </p>
        </div>
      )}
    </div>
  );
}
