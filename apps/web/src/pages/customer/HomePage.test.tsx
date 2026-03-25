/**
 * Unit tests for Customer Dashboard action button states.
 * 
 * Feature: customer-dashboard-v1
 * Property 6: Dashboard Action Button State Mapping
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import * as api from '@/lib/api';
import type { MeResponse } from '@bloom/shared';

// Mock the API module
vi.mock('@/lib/api', () => ({
  getMe: vi.fn(),
  updateMySubscription: vi.fn(),
}));

// Mock the AuthProvider
vi.mock('@/providers/AuthProvider', () => ({
  useAuth: () => ({
    refreshUser: vi.fn(),
  }),
}));

const mockGetMe = vi.mocked(api.getMe);
const mockUpdateMySubscription = vi.mocked(api.updateMySubscription);

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Base user data factory
const createMockUser = (overrides: Partial<MeResponse> = {}): MeResponse => ({
  id: 'user-123',
  email: 'customer@test.com',
  role: 'CUSTOMER',
  property_id: 'prop-123',
  property_name: 'Test Property',
  property_address: '123 Main St',
  unit: '4A',
  subscription_status: 'ACTIVE',
  subscription_plan: 'ESSENTIAL',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('HomePage Action Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test: Shows "Select your building" when property_id is null
   * Validates: Requirements 3.1
   */
  it('should show "Select your building" button when property_id is null', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        property_id: null,
        property_name: null,
        subscription_status: 'CREATED',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Select your building')).toBeInTheDocument();
    });

    // Should be a link to onboarding/property
    const link = screen.getByText('Select your building').closest('a');
    expect(link).toHaveAttribute('href', '/onboarding/property');
  });

  /**
   * Test: Shows "Activate subscription" when property set but status is CREATED
   * Validates: Requirements 3.2
   */
  it('should show "Activate subscription" button when property set and status is CREATED', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        property_id: 'prop-123',
        property_name: 'Test Property',
        subscription_status: 'CREATED',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Activate subscription')).toBeInTheDocument();
    });

    // Should be a link to onboarding/subscription
    const link = screen.getByText('Activate subscription').closest('a');
    expect(link).toHaveAttribute('href', '/onboarding/subscription');
  });

  /**
   * Test: Shows "Pause subscription" when status is ACTIVE
   * Validates: Requirements 3.3
   */
  it('should show "Pause subscription" button when status is ACTIVE', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        subscription_status: 'ACTIVE',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Pause subscription')).toBeInTheDocument();
    });

    // Should be a button (not a link)
    const button = screen.getByText('Pause subscription');
    expect(button.tagName).toBe('BUTTON');
  });

  /**
   * Test: Shows "Resume subscription" when status is PAUSED
   * Validates: Requirements 3.4
   */
  it('should show "Resume subscription" button when status is PAUSED', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        subscription_status: 'PAUSED',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Resume subscription')).toBeInTheDocument();
    });

    // Should be a button (not a link)
    const button = screen.getByText('Resume subscription');
    expect(button.tagName).toBe('BUTTON');
  });

  /**
   * Test: Pause button calls API with PAUSED status
   * Validates: Requirements 3.3
   */
  it('should call updateMySubscription with PAUSED when pause button clicked', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        subscription_status: 'ACTIVE',
      })
    );
    mockUpdateMySubscription.mockResolvedValue(
      createMockUser({
        subscription_status: 'PAUSED',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Pause subscription')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Pause subscription'));

    await waitFor(() => {
      expect(mockUpdateMySubscription).toHaveBeenCalledWith({
        subscription_status: 'PAUSED',
      });
    });
  });

  /**
   * Test: Resume button calls API with ACTIVE status
   * Validates: Requirements 3.4
   */
  it('should call updateMySubscription with ACTIVE when resume button clicked', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        subscription_status: 'PAUSED',
      })
    );
    mockUpdateMySubscription.mockResolvedValue(
      createMockUser({
        subscription_status: 'ACTIVE',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Resume subscription')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Resume subscription'));

    await waitFor(() => {
      expect(mockUpdateMySubscription).toHaveBeenCalledWith({
        subscription_status: 'ACTIVE',
      });
    });
  });

  /**
   * Test: Shows loading state while fetching
   * Validates: Requirements 2.4
   */
  it('should show loading state while fetching user data', async () => {
    // Create a promise that doesn't resolve immediately
    let resolvePromise: (value: MeResponse) => void;
    const pendingPromise = new Promise<MeResponse>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetMe.mockReturnValue(pendingPromise);

    renderWithRouter(<HomePage />);

    // Should show loading spinner (check for animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();

    // Resolve the promise
    resolvePromise!(createMockUser());

    await waitFor(() => {
      expect(screen.getByText('Welcome to Bloom')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows error message when API fails
   * Validates: Requirements 2.5, 3.6
   */
  it('should show error message when API call fails', async () => {
    mockGetMe.mockRejectedValue(new Error('Network error'));

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows property name when set
   * Validates: Requirements 2.1
   */
  it('should display property name when set', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        property_name: 'Sunset Apartments',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows placeholder when property not set
   * Validates: Requirements 2.1
   */
  it('should display placeholder when property not set', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        property_id: null,
        property_name: null,
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows "Coming soon" for next delivery
   * Validates: Requirements 2.3
   */
  it('should display "Coming soon" for next delivery', async () => {
    mockGetMe.mockResolvedValue(createMockUser());

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Coming soon')).toBeInTheDocument();
    });
  });

  /**
   * Test: Shows subscription status pill
   * Validates: Requirements 2.2
   */
  it('should display subscription status with pill styling', async () => {
    mockGetMe.mockResolvedValue(
      createMockUser({
        subscription_status: 'ACTIVE',
      })
    );

    renderWithRouter(<HomePage />);

    await waitFor(() => {
      const statusPill = screen.getByText('ACTIVE');
      expect(statusPill).toBeInTheDocument();
      expect(statusPill).toHaveClass('rounded-full');
    });
  });
});
