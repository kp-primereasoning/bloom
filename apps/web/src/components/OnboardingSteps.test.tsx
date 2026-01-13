/**
 * Property-based tests for OnboardingSteps component.
 * 
 * Feature: florist-onboarding-steps
 * Property 3: Click Opens Corresponding Modal
 * Property 4: Step Completion Updates State
 * Validates: Requirements 3.1, 3.4, 4.3, 5.3, 6.3
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import * as fc from 'fast-check';
import { OnboardingSteps } from './OnboardingSteps';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Clean up after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
  vi.clearAllMocks();
});

beforeEach(() => {
  localStorageMock.clear();
});

describe('OnboardingSteps', () => {
  /**
   * Property 3: Click Opens Corresponding Modal
   * For any step card, clicking it SHALL result in the corresponding modal being opened.
   * 
   * **Validates: Requirements 3.1**
   */
  it('should open corresponding modal when step card is clicked', () => {
    const stepIds = ['link-store', 'link-products', 'turn-on-deliveries'] as const;
    const modalTestIds = {
      'link-store': 'link-store-modal',
      'link-products': 'link-products-modal',
      'turn-on-deliveries': 'turn-on-deliveries-modal',
    };

    fc.assert(
      fc.property(
        fc.constantFrom(...stepIds),
        (stepId) => {
          cleanup();
          localStorageMock.clear();
          
          render(<OnboardingSteps />);
          
          // Click the step card
          const stepCard = screen.getByTestId(`step-card-${stepId}`);
          fireEvent.click(stepCard);
          
          // Verify the correct modal is open
          const modalTestId = modalTestIds[stepId];
          expect(screen.getByTestId(modalTestId)).toBeInTheDocument();
          
          // Verify other modals are not open
          for (const [id, testId] of Object.entries(modalTestIds)) {
            if (id !== stepId) {
              expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
            }
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 4: Step Completion Updates State
   * For any step, when the onComplete callback is triggered from its modal,
   * the step's completion state SHALL be updated to true and persisted.
   * 
   * **Validates: Requirements 3.4, 4.3, 5.3, 6.3**
   */
  it('should update step completion state when step is completed', () => {
    // Test link-store completion
    cleanup();
    localStorageMock.clear();
    
    render(<OnboardingSteps />);
    
    // Open link-store modal
    fireEvent.click(screen.getByTestId('step-card-link-store'));
    expect(screen.getByTestId('link-store-modal')).toBeInTheDocument();
    
    // Complete the step
    fireEvent.click(screen.getByTestId('connect-shopify-button'));
    
    // Modal should close
    expect(screen.queryByTestId('link-store-modal')).not.toBeInTheDocument();
    
    // Step should show complete indicator
    expect(screen.getByTestId('step-card-link-store')).toContainElement(
      screen.getByTestId('step-complete-indicator')
    );
    
    // State should be persisted
    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedState = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
    expect(savedState.storeLinked).toBe(true);
  });

  it('should persist all step completions to localStorage', () => {
    cleanup();
    localStorageMock.clear();
    
    render(<OnboardingSteps />);
    
    // Complete step 1: Link Store
    fireEvent.click(screen.getByTestId('step-card-link-store'));
    fireEvent.click(screen.getByTestId('connect-shopify-button'));
    
    // Complete step 2: Link Products
    fireEvent.click(screen.getByTestId('step-card-link-products'));
    fireEvent.click(screen.getByTestId('link-products-button'));
    
    // Complete step 3: Turn on Deliveries
    fireEvent.click(screen.getByTestId('step-card-turn-on-deliveries'));
    fireEvent.click(screen.getByTestId('confirm-checkbox'));
    fireEvent.click(screen.getByTestId('enable-deliveries-button'));
    
    // All steps should be complete
    const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
    const finalState = JSON.parse(lastCall[1]);
    
    expect(finalState.storeLinked).toBe(true);
    expect(finalState.productsLinked).toBe(true);
    expect(finalState.deliveriesEnabled).toBe(true);
    expect(finalState.completedAt).toBeDefined();
  });

  // Unit tests
  it('should render three step cards', () => {
    render(<OnboardingSteps />);
    
    expect(screen.getByTestId('step-card-link-store')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-link-products')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-turn-on-deliveries')).toBeInTheDocument();
  });

  it('should display steps in correct order', () => {
    render(<OnboardingSteps />);
    
    const stepCards = screen.getAllByTestId(/^step-card-/);
    expect(stepCards).toHaveLength(3);
    
    expect(stepCards[0]).toHaveAttribute('data-testid', 'step-card-link-store');
    expect(stepCards[1]).toHaveAttribute('data-testid', 'step-card-link-products');
    expect(stepCards[2]).toHaveAttribute('data-testid', 'step-card-turn-on-deliveries');
  });

  it('should show success state when all steps are complete', () => {
    // Pre-populate localStorage with complete state
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      storeLinked: true,
      productsLinked: true,
      deliveriesEnabled: true,
      completedAt: new Date().toISOString(),
    }));
    
    render(<OnboardingSteps />);
    
    expect(screen.getByTestId('onboarding-complete')).toBeInTheDocument();
    expect(screen.queryByTestId('step-card-link-store')).not.toBeInTheDocument();
  });

  it('should load state from localStorage on mount', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      storeLinked: true,
      productsLinked: false,
      deliveriesEnabled: false,
    }));
    
    render(<OnboardingSteps />);
    
    // First step should show complete
    const linkStoreCard = screen.getByTestId('step-card-link-store');
    expect(linkStoreCard).toContainElement(screen.getByTestId('step-complete-indicator'));
    
    // Other steps should show incomplete
    const linkProductsCard = screen.getByTestId('step-card-link-products');
    expect(linkProductsCard).toContainElement(screen.getAllByTestId('step-incomplete-indicator')[0]);
  });

  it('should close modal when backdrop is clicked', () => {
    render(<OnboardingSteps />);
    
    // Open modal
    fireEvent.click(screen.getByTestId('step-card-link-store'));
    expect(screen.getByTestId('link-store-modal')).toBeInTheDocument();
    
    // Click backdrop
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    
    // Modal should close
    expect(screen.queryByTestId('link-store-modal')).not.toBeInTheDocument();
  });
});
