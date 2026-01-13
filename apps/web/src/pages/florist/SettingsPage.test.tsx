/**
 * Unit tests for SettingsPage integration with OnboardingSteps.
 * 
 * Feature: florist-onboarding-steps
 * Validates: Requirements 1.1, 1.2, 1.3
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// Mock the API
vi.mock('@/lib/api', () => ({
  getFloristMe: vi.fn(() => Promise.resolve({
    florist_id: 'test-florist-id',
    florist_name: 'Test Florist',
    florist_status: 'ONBOARDING',
    assigned_properties: [],
  })),
}));

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
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
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
  // Initialize with default onboarding state
  localStorageMock._setStore({
    'florist_onboarding_state': JSON.stringify({
      storeLinked: false,
      productsLinked: false,
      deliveriesEnabled: false,
    }),
  });
});

describe('SettingsPage with OnboardingSteps', () => {
  /**
   * Requirement 1.1: WHEN a florist visits the Settings page, 
   * THE Onboarding_Steps_Section SHALL display three Step_Cards
   */
  it('should render onboarding section with three step cards', async () => {
    render(<SettingsPage />);
    
    // Wait for loading to complete and onboarding to render
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-steps')).toBeInTheDocument();
    });
    
    // Verify three step cards are present
    expect(screen.getByTestId('step-card-link-store')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-link-products')).toBeInTheDocument();
    expect(screen.getByTestId('step-card-turn-on-deliveries')).toBeInTheDocument();
  });

  /**
   * Requirement 1.2: THE Onboarding_Steps_Section SHALL display the steps in this order:
   * "Link a Store", "Link Products", "Turn on Deliveries"
   */
  it('should display steps in correct order', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-steps')).toBeInTheDocument();
    });
    
    const stepCards = screen.getAllByTestId(/^step-card-/);
    expect(stepCards).toHaveLength(3);
    
    // Verify order
    expect(stepCards[0]).toHaveAttribute('data-testid', 'step-card-link-store');
    expect(stepCards[1]).toHaveAttribute('data-testid', 'step-card-link-products');
    expect(stepCards[2]).toHaveAttribute('data-testid', 'step-card-turn-on-deliveries');
  });

  /**
   * Requirement 1.3: WHEN the page loads, THE Onboarding_Steps_Section 
   * SHALL show before all other settings content
   */
  it('should render onboarding section before other settings content', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-steps')).toBeInTheDocument();
    });
    
    // Get the main container
    const container = screen.getByTestId('onboarding-steps').parentElement;
    
    // Onboarding steps should be the first child
    const firstChild = container?.firstElementChild;
    expect(firstChild).toHaveAttribute('data-testid', 'onboarding-steps');
  });

  it('should display step titles correctly', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-steps')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Link a Store')).toBeInTheDocument();
    expect(screen.getByText('Link Products')).toBeInTheDocument();
    expect(screen.getByText('Turn on Deliveries')).toBeInTheDocument();
  });

  it('should display step descriptions correctly', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('onboarding-steps')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Connect your Shopify store to sync products')).toBeInTheDocument();
    expect(screen.getByText('Select which products to offer on Bloom')).toBeInTheDocument();
    expect(screen.getByText('Start receiving delivery requests')).toBeInTheDocument();
  });

  it('should still render business info and assigned properties sections', async () => {
    render(<SettingsPage />);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).not.toBeInTheDocument();
    });
    
    // Business info section
    expect(screen.getByText('Business Information')).toBeInTheDocument();
    expect(screen.getByText('Test Florist')).toBeInTheDocument();
    
    // Assigned properties section
    expect(screen.getByText('Assigned Properties')).toBeInTheDocument();
  });
});
