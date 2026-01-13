/**
 * OnboardingSteps component for florist setup progress.
 * 
 * Displays three onboarding step cards and manages completion state.
 * Persists state to localStorage for MLP phase.
 */

import { useState, useEffect, useCallback } from 'react';
import { StepCard, type OnboardingStep } from './StepCard';
import { LinkStoreModal } from './LinkStoreModal';
import { LinkProductsModal } from './LinkProductsModal';
import { TurnOnDeliveriesModal } from './TurnOnDeliveriesModal';

const STORAGE_KEY = 'florist_onboarding_state';

interface FloristOnboardingState {
  storeLinked: boolean;
  productsLinked: boolean;
  deliveriesEnabled: boolean;
  completedAt?: string;
}

const DEFAULT_STATE: FloristOnboardingState = {
  storeLinked: false,
  productsLinked: false,
  deliveriesEnabled: false,
};

type ModalType = 'link-store' | 'link-products' | 'turn-on-deliveries' | null;

/**
 * Load onboarding state from localStorage
 */
function loadState(): FloristOnboardingState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    console.warn('Failed to load onboarding state from localStorage');
  }
  return DEFAULT_STATE;
}

/**
 * Save onboarding state to localStorage
 */
function saveState(state: FloristOnboardingState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.warn('Failed to save onboarding state to localStorage');
  }
}

/**
 * OnboardingSteps displays the three setup steps for florists.
 * 
 * - Shows step cards in horizontal row (vertical on mobile)
 * - Manages completion state with localStorage persistence
 * - Opens modals when steps are clicked
 * - Shows success state when all steps complete
 */
export function OnboardingSteps() {
  const [state, setState] = useState<FloristOnboardingState>(DEFAULT_STATE);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    setState(loadState());
    setIsLoaded(true);
  }, []);

  // Build steps array with current completion status
  const steps: OnboardingStep[] = [
    {
      id: 'link-store',
      number: 1,
      title: 'Link a Store',
      description: 'Connect your Shopify store to sync products',
      isComplete: state.storeLinked,
    },
    {
      id: 'link-products',
      number: 2,
      title: 'Link Products',
      description: 'Select which products to offer on Bloom',
      isComplete: state.productsLinked,
    },
    {
      id: 'turn-on-deliveries',
      number: 3,
      title: 'Turn on Deliveries',
      description: 'Start receiving delivery requests',
      isComplete: state.deliveriesEnabled,
    },
  ];

  const allComplete = state.storeLinked && state.productsLinked && state.deliveriesEnabled;

  const handleStepClick = useCallback((stepId: OnboardingStep['id']) => {
    setOpenModal(stepId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setOpenModal(null);
  }, []);

  const handleStepComplete = useCallback((stepId: OnboardingStep['id']) => {
    setState((prev) => {
      const newState = { ...prev };
      
      switch (stepId) {
        case 'link-store':
          newState.storeLinked = true;
          break;
        case 'link-products':
          newState.productsLinked = true;
          break;
        case 'turn-on-deliveries':
          newState.deliveriesEnabled = true;
          // Check if all complete
          if (newState.storeLinked && newState.productsLinked && newState.deliveriesEnabled) {
            newState.completedAt = new Date().toISOString();
          }
          break;
      }
      
      saveState(newState);
      return newState;
    });
    
    setOpenModal(null);
  }, []);

  // Don't render until state is loaded from localStorage
  if (!isLoaded) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="onboarding-steps">
      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900">Get Started</h2>
        <p className="text-sm text-gray-500 mt-1">
          Complete these steps to start receiving deliveries on Bloom.
        </p>
      </div>

      {allComplete ? (
        // Success state
        <div 
          className="bg-green-50 border border-green-200 rounded-lg p-4"
          data-testid="onboarding-complete"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-green-900">Setup Complete!</h3>
              <p className="text-sm text-green-700 mt-0.5">
                You're all set to receive deliveries. Check your Deliveries page for incoming orders.
              </p>
            </div>
          </div>
        </div>
      ) : (
        // Step cards
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              onClick={() => handleStepClick(step.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <LinkStoreModal
        isOpen={openModal === 'link-store'}
        onClose={handleCloseModal}
        onComplete={() => handleStepComplete('link-store')}
      />
      
      <LinkProductsModal
        isOpen={openModal === 'link-products'}
        onClose={handleCloseModal}
        onComplete={() => handleStepComplete('link-products')}
        storeLinked={state.storeLinked}
      />
      
      <TurnOnDeliveriesModal
        isOpen={openModal === 'turn-on-deliveries'}
        onClose={handleCloseModal}
        onComplete={() => handleStepComplete('turn-on-deliveries')}
        productsLinked={state.productsLinked}
      />
    </div>
  );
}
