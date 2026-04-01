/**
 * Subscription activation page for customer onboarding.
 * Step 3: Review property and activate subscription.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { updateMySubscription, listProperties } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { PropertyListItem } from '@bloom/shared';

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();

  const [property, setProperty] = useState<PropertyListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/onboarding/register'); return; }
    if (user?.role !== 'CUSTOMER') {
      navigate({ ADMIN: '/admin', PROPERTY_MANAGER: '/pm', FLORIST: '/florist' }[user?.role || ''] || '/');
      return;
    }
    if (!user?.property_id) { navigate('/onboarding/property'); return; }
    if (user?.subscription_status !== 'CREATED') navigate('/customer');
  }, [isAuthenticated, user, authLoading, navigate]);

  useEffect(() => {
    if (!user?.property_id) return;
    listProperties()
      .then((props) => { const found = props.find((p) => p.id === user.property_id); if (found) setProperty(found); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load property'))
      .finally(() => setIsLoading(false));
  }, [user?.property_id]);

  const handleActivate = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await updateMySubscription({ subscription_status: 'ACTIVE' });
      await refreshUser();
      navigate('/customer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate subscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <OnboardingLayout currentStep={3} title="Loading...">
        <div className="flex justify-center py-8">
          <motion.div className="rounded-full h-8 w-8 border-b-2 border-bloom-sage" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </div>
      </OnboardingLayout>
    );
  }

  const benefits = [
    'Fresh flower deliveries to your door',
    'Curated arrangements from local florists',
    'Flexible skip and pause options',
  ];

  return (
    <OnboardingLayout currentStep={3} title="Almost there" subtitle="Review your selection and start receiving fresh flowers">
      <motion.div className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-lg text-sm overflow-hidden">
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Property summary */}
        <div className="border border-stone-200 rounded-lg p-5">
          <span className="text-[0.6875rem] tracking-[0.15em] uppercase text-stone-400 font-medium">Your building</span>
          {property ? (
            <div className="mt-2">
              <div className="font-serif text-lg text-bloom-dark">{property.name}</div>
              <div className="text-sm text-stone-400 mt-0.5">{property.address}</div>
            </div>
          ) : (
            <div className="text-stone-400 mt-2 text-sm">Property details not available</div>
          )}
        </div>

        {/* Benefits */}
        <div className="border border-bloom-sage/20 bg-bloom-sage/5 rounded-lg p-5">
          <span className="text-[0.6875rem] tracking-[0.15em] uppercase text-bloom-sage font-medium">What you'll get</span>
          <ul className="mt-3 space-y-2.5">
            {benefits.map((benefit, i) => (
              <motion.li key={benefit} className="flex items-start gap-2.5 text-[0.9375rem] text-bloom-dark font-light"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                <svg className="w-4 h-4 mt-0.5 text-bloom-sage shrink-0" fill="none" viewBox="0 0 20 20">
                  <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {benefit}
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Activate */}
        <motion.button onClick={handleActivate} disabled={isSubmitting}
          className="w-full py-3.5 bg-bloom-dark hover:bg-stone-900 text-white rounded-lg text-sm font-medium tracking-wide transition-all disabled:opacity-40"
          whileHover={!isSubmitting ? { scale: 1.01 } : {}}
          whileTap={!isSubmitting ? { scale: 0.99 } : {}}>
          {isSubmitting
            ? <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>Activating...</motion.span>
            : 'Activate subscription'}
        </motion.button>

        <p className="text-center text-[0.8125rem] text-stone-400 font-light">
          You can pause or cancel anytime from your dashboard.
        </p>
      </motion.div>
    </OnboardingLayout>
  );
}
