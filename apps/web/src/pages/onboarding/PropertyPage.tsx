/**
 * Property selection page for customer onboarding.
 * Step 2: Select apartment complex and enter unit number.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { listProperties, updateMyProperty, submitWaitlistEntry } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { PropertyListItem } from '@bloom/shared';

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

  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');

  const selectedProperty = useMemo(
    () => properties.find((p) => p.id === selectedPropertyId) || null,
    [properties, selectedPropertyId],
  );

  const handlePropertySelect = (propertyId: string) => {
    if (propertyId !== selectedPropertyId) setUnit('');
    setSelectedPropertyId(propertyId);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('onboarding_property_id');
    if (stored) setSelectedPropertyId(stored);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { navigate('/onboarding/register'); return; }
    if (user?.role !== 'CUSTOMER') {
      navigate({ ADMIN: '/admin', PROPERTY_MANAGER: '/pm', FLORIST: '/florist' }[user?.role || ''] || '/');
      return;
    }
    if (user?.property_id && user?.subscription_status !== 'CREATED') navigate('/customer');
  }, [isAuthenticated, user, authLoading, navigate]);

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load properties'))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProperties = useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter((p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q));
  }, [properties, searchQuery]);

  const handleSubmit = async () => {
    if (!selectedPropertyId) { setError('Please select a property'); return; }
    if (!unit.trim()) { setError('Please enter your unit number'); return; }
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
    if (!buildingName.trim() || !buildingAddress.trim()) { setError('Please fill in both fields'); return; }
    setIsSubmitting(true);
    setError('');
    try {
      await submitWaitlistEntry({ building_name: buildingName.trim(), building_address: buildingAddress.trim() });
      setWaitlistSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <OnboardingLayout currentStep={2} title="Loading...">
        <div className="flex justify-center py-8">
          <motion.div className="rounded-full h-8 w-8 border-b-2 border-bloom-sage" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
        </div>
      </OnboardingLayout>
    );
  }

  if (waitlistSuccess) {
    return (
      <OnboardingLayout currentStep={2} title="You're on the list" subtitle="We'll notify you when your building goes live">
        <motion.div className="space-y-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="font-serif text-4xl">🌿</p>
          <p className="text-stone-500 text-[0.9375rem] font-light">We'll reach out as soon as your building is set up.</p>
          <button onClick={() => { setShowWaitlistForm(false); setWaitlistSuccess(false); setBuildingName(''); setBuildingAddress(''); setError(''); }}
            className="w-full py-3 border border-stone-300 text-stone-600 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors">
            Back to property list
          </button>
        </motion.div>
      </OnboardingLayout>
    );
  }

  if (showWaitlistForm) {
    return (
      <OnboardingLayout currentStep={2} title="Tell us about your building" subtitle="We'll work on getting it on Bloom">
        <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ErrorBanner error={error} />
          <Field label="Building name" required>
            <input type="text" maxLength={255} value={buildingName} onChange={(e) => setBuildingName(e.target.value)} placeholder="e.g., The Meridian" className="input-field" />
          </Field>
          <Field label="Building address" required>
            <input type="text" maxLength={500} value={buildingAddress} onChange={(e) => setBuildingAddress(e.target.value)} placeholder="e.g., 123 Main St, New York, NY 10001" className="input-field" />
          </Field>
          <PrimaryButton onClick={handleWaitlistSubmit} disabled={!buildingName.trim() || !buildingAddress.trim() || isSubmitting} loading={isSubmitting} label="Submit" />
          <button onClick={() => { setShowWaitlistForm(false); setError(''); }}
            className="w-full py-3 border border-stone-300 text-stone-600 hover:bg-stone-50 rounded-lg text-sm font-medium transition-colors">
            Back to property list
          </button>
        </motion.div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep={2} title="Select your building" subtitle="Choose the apartment complex where you live">
      <motion.div className="space-y-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ErrorBanner error={error} />

        <Field label="Building">
          <input type="text" placeholder="Search by name or address..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field" />
        </Field>

        <div className="max-h-52 overflow-y-auto border border-stone-200 rounded-lg">
          {filteredProperties.length === 0 ? (
            <div className="p-4 text-center text-stone-400 text-sm">{searchQuery ? 'No properties match your search' : 'No properties available'}</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {filteredProperties.map((property) => (
                <li key={property.id} onClick={() => handlePropertySelect(property.id)}
                  className={`p-4 cursor-pointer transition-all ${selectedPropertyId === property.id ? 'bg-bloom-sage/10 border-l-3 border-bloom-sage' : 'hover:bg-stone-50'}`}>
                  <div className="text-[0.9375rem] font-medium text-bloom-dark">{property.name}</div>
                  <div className="text-sm text-stone-400">{property.address}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-center">
          <button type="button" onClick={() => { setShowWaitlistForm(true); setError(''); }}
            className="text-sm text-bloom-sage hover:text-bloom-dark transition-colors">
            My building isn't listed
          </button>
        </div>

        <AnimatePresence>
          {selectedProperty && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
              <Field label="Address">
                <input type="text" value={selectedProperty.address} readOnly className="w-full px-4 py-3 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 text-sm cursor-not-allowed" />
              </Field>
              <Field label="Unit / Apartment Number" required>
                <input type="text" required value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., 4B, 201" className="input-field" />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <PrimaryButton onClick={handleSubmit} disabled={!selectedPropertyId || !unit.trim() || isSubmitting} loading={isSubmitting} label="Continue" />
      </motion.div>
    </OnboardingLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-stone-500 mb-1.5">
        {label}{required && <span className="text-bloom-rose ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="bg-red-50 border border-red-200/60 text-red-700 px-4 py-3 rounded-lg text-sm overflow-hidden">
      {error}
    </motion.div>
  );
}

function PrimaryButton({ onClick, disabled, loading, label }: { onClick: () => void; disabled: boolean; loading: boolean; label: string }) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      className="w-full py-3 bg-bloom-dark hover:bg-stone-900 text-white rounded-lg text-sm font-medium tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}>
      {loading ? <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>Saving...</motion.span> : label}
    </motion.button>
  );
}
