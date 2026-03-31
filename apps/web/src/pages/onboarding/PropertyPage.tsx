/**
 * Property selection page for customer onboarding.
 * Step 2: Select apartment complex and enter unit number.
 * Enhanced with Motion animations for smooth interactions.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { listProperties, updateMyProperty, submitWaitlistEntry } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { PropertyListItem } from '@bloom/shared';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

export function PropertyPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading, refreshUser } = useAuth();
  
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [unit, setUnit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');

  // Get selected property details
  const selectedProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || null;
  }, [properties, selectedPropertyId]);

  // Clear unit when property changes
  const handlePropertySelect = (propertyId: string) => {
    if (propertyId !== selectedPropertyId) {
      setUnit('');
    }
    setSelectedPropertyId(propertyId);
  };

  useEffect(() => {
    const storedPropertyId = sessionStorage.getItem('onboarding_property_id');
    if (storedPropertyId) {
      setSelectedPropertyId(storedPropertyId);
    }
  }, []);
  
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
    
    if (user?.property_id && user?.subscription_status !== 'CREATED') {
      navigate('/customer');
    }
  }, [isAuthenticated, user, authLoading, navigate]);
  
  useEffect(() => {
    async function fetchProperties() {
      try {
        const data = await listProperties();
        setProperties(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load properties');
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperties();
  }, []);
  
  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter(
      (p) => p.name.toLowerCase().includes(query) || p.address.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);
  
  const handleSubmit = async () => {
    if (!selectedPropertyId) {
      setError('Please select a property');
      return;
    }
    
    if (!unit.trim()) {
      setError('Please enter your unit number');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await updateMyProperty({ property_id: selectedPropertyId, unit: unit.trim() });
      sessionStorage.removeItem('onboarding_property_id');
      await refreshUser();
      navigate('/onboarding/subscription');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWaitlistSubmit = async () => {
    if (!buildingName.trim() || !buildingAddress.trim()) {
      setError('Please fill in both building name and address');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await submitWaitlistEntry({
        building_name: buildingName.trim(),
        building_address: buildingAddress.trim(),
      });
      setWaitlistSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit waitlist entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToList = () => {
    setShowWaitlistForm(false);
    setWaitlistSuccess(false);
    setBuildingName('');
    setBuildingAddress('');
    setError('');
  };
  
  if (authLoading || isLoading) {
    return (
      <OnboardingLayout currentStep={2} title="Loading...">
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

  // Waitlist confirmation screen
  if (waitlistSuccess) {
    return (
      <OnboardingLayout
        currentStep={2}
        title="You're on the list!"
        subtitle="We'll notify you when your building goes live"
      >
        <motion.div
          className="space-y-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-green-500 text-4xl">🌸</div>
          <p className="text-gray-600">
            We'll notify you when your building goes live
          </p>
          <motion.button
            onClick={handleBackToList}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Back to property list
          </motion.button>
        </motion.div>
      </OnboardingLayout>
    );
  }

  // Waitlist form
  if (showWaitlistForm) {
    return (
      <OnboardingLayout
        currentStep={2}
        title="Tell us about your building"
        subtitle="We'll work on getting your building on Bloom"
      >
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
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

          <div>
            <label htmlFor="buildingName" className="block text-sm font-medium text-gray-700 mb-1">
              Building name <span className="text-red-500">*</span>
            </label>
            <motion.input
              id="buildingName"
              type="text"
              required
              maxLength={255}
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="e.g., The Meridian"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
            />
          </div>

          <div>
            <label htmlFor="buildingAddress" className="block text-sm font-medium text-gray-700 mb-1">
              Building address <span className="text-red-500">*</span>
            </label>
            <motion.input
              id="buildingAddress"
              type="text"
              required
              maxLength={500}
              value={buildingAddress}
              onChange={(e) => setBuildingAddress(e.target.value)}
              placeholder="e.g., 123 Main St, New York, NY 10001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
            />
          </div>

          <motion.button
            onClick={handleWaitlistSubmit}
            disabled={!buildingName.trim() || !buildingAddress.trim() || isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={!isSubmitting && buildingName.trim() && buildingAddress.trim() ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting && buildingName.trim() && buildingAddress.trim() ? { scale: 0.98 } : {}}
          >
            {isSubmitting ? (
              <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                Submitting...
              </motion.span>
            ) : (
              'Submit'
            )}
          </motion.button>

          <motion.button
            onClick={handleBackToList}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Back to property list
          </motion.button>
        </motion.div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      currentStep={2}
      title="Select your property"
      subtitle="Choose the apartment complex where you live"
    >
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
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
        
        {/* Search input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building
          </label>
          <motion.input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
          />
        </motion.div>
        
        {/* Property list */}
        <motion.div 
          className="max-h-48 overflow-y-auto border border-gray-200 rounded-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {filteredProperties.length === 0 ? (
            <motion.div 
              className="p-4 text-center text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {searchQuery ? 'No properties match your search' : 'No properties available'}
            </motion.div>
          ) : (
            <motion.ul 
              className="divide-y divide-gray-200"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {filteredProperties.map((property) => (
                <motion.li
                  key={property.id}
                  variants={itemVariants}
                  onClick={() => handlePropertySelect(property.id)}
                  className={`
                    p-4 cursor-pointer transition-colors
                    ${selectedPropertyId === property.id 
                      ? 'bg-green-50 border-l-4 border-green-500' 
                      : 'hover:bg-gray-50'
                    }
                  `}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.99 }}
                  layout
                >
                  <div className="font-medium text-gray-900">{property.name}</div>
                  <div className="text-sm text-gray-500">{property.address}</div>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>

        {/* My building isn't listed link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <button
            type="button"
            onClick={() => { setShowWaitlistForm(true); setError(''); }}
            className="text-sm text-green-600 hover:text-green-500 underline"
          >
            My building isn't listed
          </button>
        </motion.div>

        {/* Address and Unit fields - shown when property is selected */}
        <AnimatePresence>
          {selectedProperty && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Read-only Address field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={selectedProperty.address}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                />
              </motion.div>
              
              {/* Unit input field */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                  Unit / Apartment Number <span className="text-red-500">*</span>
                </label>
                <motion.input
                  id="unit"
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g., 4B, 201, Suite 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  whileFocus={{ boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.2)' }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Continue button */}
        <motion.button
          onClick={handleSubmit}
          disabled={!selectedPropertyId || !unit.trim() || isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={!isSubmitting && selectedPropertyId && unit.trim() ? { scale: 1.02 } : {}}
          whileTap={!isSubmitting && selectedPropertyId && unit.trim() ? { scale: 0.98 } : {}}
        >
          {isSubmitting ? (
            <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              Saving...
            </motion.span>
          ) : (
            'Continue'
          )}
        </motion.button>
      </motion.div>
    </OnboardingLayout>
  );
}
