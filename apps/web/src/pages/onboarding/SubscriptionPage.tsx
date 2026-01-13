/**
 * Subscription activation page for customer onboarding.
 * Step 3: Review property and activate subscription.
 * Enhanced with Motion animations for a celebratory finish.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { updateMySubscription, listProperties } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { PropertyListItem } from '@bloom/shared';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const checkVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: { pathLength: 1, opacity: 1, transition: { duration: 0.3, delay: 0.2 } }
};

export function SubscriptionPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  
  const [property, setProperty] = useState<PropertyListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      navigate('/onboarding/register');
      return;
    }
    
    if (user?.role !== 'CUSTOMER') {
      const landingPages: Record<string, string> = {
        ADMIN: '/admin',
        PROPERTY_MANAGER: '/pm',
        FLORIST: '/florist',
      };
      navigate(landingPages[user?.role || ''] || '/');
      return;
    }
    
    if (!user?.property_id) {
      navigate('/onboarding/property');
      return;
    }
    
    if (user?.subscription_status !== 'CREATED') {
      navigate('/customer');
    }
  }, [isAuthenticated, user, authLoading, navigate]);
  
  useEffect(() => {
    async function fetchProperty() {
      if (!user?.property_id) return;
      
      try {
        const properties = await listProperties();
        const found = properties.find((p) => p.id === user.property_id);
        if (found) setProperty(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property details');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (user?.property_id) fetchProperty();
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
          <motion.div
            className="rounded-full h-8 w-8 border-b-2 border-green-600"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </OnboardingLayout>
    );
  }

  const benefits = [
    'Fresh flower deliveries to your door',
    'Curated arrangements from local florists',
    'Flexible skip and pause options'
  ];

  return (
    <OnboardingLayout
      currentStep={3}
      title="Activate your subscription"
      subtitle="Review your selection and start receiving fresh flowers"
    >
      <motion.div 
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded overflow-hidden"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Property summary */}
        <motion.div 
          className="bg-gray-50 rounded-lg p-6"
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Your Property
          </h3>
          {property ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-lg font-semibold text-gray-900">{property.name}</div>
              <div className="text-gray-600">{property.address}</div>
            </motion.div>
          ) : (
            <div className="text-gray-500">Property details not available</div>
          )}
        </motion.div>
        
        {/* Subscription info */}
        <motion.div 
          className="bg-green-50 rounded-lg p-6"
          variants={itemVariants}
        >
          <h3 className="text-sm font-medium text-green-800 uppercase tracking-wide mb-3">
            What you'll get
          </h3>
          <ul className="space-y-3 text-green-900">
            {benefits.map((benefit, index) => (
              <motion.li 
                key={benefit}
                className="flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <motion.svg 
                  className="w-5 h-5 mr-2 text-green-600" 
                  fill="none" 
                  viewBox="0 0 20 20"
                  initial="hidden"
                  animate="visible"
                >
                  <motion.path
                    d="M4 10l4 4 8-8"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={checkVariants}
                    style={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                  />
                </motion.svg>
                {benefit}
              </motion.li>
            ))}
          </ul>
        </motion.div>
        
        {/* Activate button */}
        <motion.button
          onClick={handleActivate}
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          variants={itemVariants}
          whileHover={!isSubmitting ? { scale: 1.02, boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)' } : {}}
          whileTap={!isSubmitting ? { scale: 0.98 } : {}}
        >
          {isSubmitting ? (
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              Activating...
            </motion.span>
          ) : (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center"
            >
              🌸 Activate Subscription
            </motion.span>
          )}
        </motion.button>
        
        <motion.p 
          className="text-center text-sm text-gray-500"
          variants={itemVariants}
        >
          You can pause or cancel your subscription at any time from your dashboard.
        </motion.p>
      </motion.div>
    </OnboardingLayout>
  );
}
