/**
 * Feature: florist-deliveries-page
 * Tests for Florist DeliveriesPage component
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4
 *
 * Tests cover:
 * - Loading state renders spinner
 * - Empty state renders appropriate message
 * - Deliveries table renders correct columns
 * - Action buttons trigger correct API calls
 * - Successful action removes delivery from list
 * - Error state displays on API failure
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DeliveriesPage } from '../pages/florist/DeliveriesPage';
import * as api from '../lib/api';
import type { FloristDeliveriesListResponse, FloristDelivery } from '@bloom/shared';

// Mock the API module
vi.mock('../lib/api', () => ({
  getFloristDeliveries: vi.fn(),
  updateDeliveryStatus: vi.fn(),
}));

// Helper to render with router
function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

// Mock delivery data
const mockDelivery1: FloristDelivery = {
  id: 'del-1',
  customer_email: 'customer1@example.com',
  property_id: 'prop-1',
  property_name: 'Sunset Apartments',
  property_address: '123 Main St',
  subscription_plan: 'ESSENTIAL',
  status: 'SCHEDULED',
  scheduled_for: '2026-01-15T10:00:00Z',
};

const mockDelivery2: FloristDelivery = {
  id: 'del-2',
  customer_email: 'customer2@example.com',
  property_id: 'prop-1',
  property_name: 'Sunset Apartments',
  property_address: '123 Main St',
  subscription_plan: 'SIGNATURE',
  status: 'SCHEDULED',
  scheduled_for: '2026-01-16T10:00:00Z',
};

const mockDeliveriesResponse: FloristDeliveriesListResponse = {
  deliveries: [mockDelivery1, mockDelivery2],
};

const mockEmptyDeliveriesResponse: FloristDeliveriesListResponse = {
  deliveries: [],
};

describe('FloristDeliveriesPage - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should show loading spinner while fetching data', async () => {
    // Create a promise we can control
    let resolveDeliveries: (value: FloristDeliveriesListResponse) => void;
    const deliveriesPromise = new Promise<FloristDeliveriesListResponse>((resolve) => {
      resolveDeliveries = resolve;
    });

    vi.mocked(api.getFloristDeliveries).mockReturnValue(deliveriesPromise);

    const { container } = renderWithRouter(<DeliveriesPage />);

    // Should show loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText('Loading deliveries...')).toBeInTheDocument();

    // Resolve the promise
    resolveDeliveries!(mockDeliveriesResponse);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Upcoming Deliveries')).toBeInTheDocument();
    });
  });
});

describe('FloristDeliveriesPage - Empty State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display empty state message when no deliveries', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue(mockEmptyDeliveriesResponse);

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('No upcoming deliveries scheduled.')).toBeInTheDocument();
    });
  });
});

describe('FloristDeliveriesPage - Table Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render deliveries table with correct columns', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue(mockDeliveriesResponse);

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      // Table headers
      expect(screen.getByText('Delivery Date')).toBeInTheDocument();
      expect(screen.getByText('Property')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Plan')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('should display delivery data in table rows', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue(mockDeliveriesResponse);

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      // Customer emails
      expect(screen.getByText('customer1@example.com')).toBeInTheDocument();
      expect(screen.getByText('customer2@example.com')).toBeInTheDocument();

      // Property names (appears twice for two deliveries)
      expect(screen.getAllByText('Sunset Apartments').length).toBe(2);

      // Property addresses
      expect(screen.getAllByText('123 Main St').length).toBe(2);

      // Subscription plans
      expect(screen.getByText('ESSENTIAL')).toBeInTheDocument();
      expect(screen.getByText('SIGNATURE')).toBeInTheDocument();
    });
  });

  it('should render action buttons for each delivery', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue(mockDeliveriesResponse);

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      // Should have 2 "Mark Delivered" buttons (one per delivery)
      const deliveredButtons = screen.getAllByText('Mark Delivered');
      expect(deliveredButtons.length).toBe(2);

      // Should have 2 "Mark Missed" buttons (one per delivery)
      const missedButtons = screen.getAllByText('Mark Missed');
      expect(missedButtons.length).toBe(2);
    });
  });
});

describe('FloristDeliveriesPage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display error message when API fails', async () => {
    const errorMessage = 'Failed to load deliveries';
    vi.mocked(api.getFloristDeliveries).mockRejectedValue(new Error(errorMessage));

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});

describe('FloristDeliveriesPage - Action Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should call updateDeliveryStatus with DELIVERED when Mark Delivered clicked', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue({
      deliveries: [mockDelivery1],
    });
    vi.mocked(api.updateDeliveryStatus).mockResolvedValue({
      ...mockDelivery1,
      status: 'DELIVERED',
    });

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark Delivered')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Delivered'));

    await waitFor(() => {
      expect(api.updateDeliveryStatus).toHaveBeenCalledWith('del-1', 'DELIVERED');
    });
  });

  it('should call updateDeliveryStatus with MISSED when Mark Missed clicked', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue({
      deliveries: [mockDelivery1],
    });
    vi.mocked(api.updateDeliveryStatus).mockResolvedValue({
      ...mockDelivery1,
      status: 'MISSED',
    });

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark Missed')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Missed'));

    await waitFor(() => {
      expect(api.updateDeliveryStatus).toHaveBeenCalledWith('del-1', 'MISSED');
    });
  });

  it('should remove delivery from list after successful Mark Delivered', async () => {
    vi.mocked(api.getFloristDeliveries).mockResolvedValue({
      deliveries: [mockDelivery1],
    });
    vi.mocked(api.updateDeliveryStatus).mockResolvedValue({
      ...mockDelivery1,
      status: 'DELIVERED',
    });

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('customer1@example.com')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Delivered'));

    await waitFor(() => {
      // Delivery should be removed from list
      expect(screen.queryByText('customer1@example.com')).not.toBeInTheDocument();
      // Should show empty state
      expect(screen.getByText('No upcoming deliveries scheduled.')).toBeInTheDocument();
    });
  });

  it('should display action error message when update fails', async () => {
    const errorMessage = 'Failed to mark as delivered';
    vi.mocked(api.getFloristDeliveries).mockResolvedValue({
      deliveries: [mockDelivery1],
    });
    vi.mocked(api.updateDeliveryStatus).mockRejectedValue(new Error(errorMessage));

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark Delivered')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Delivered'));

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Delivery should still be in the list
    expect(screen.getByText('customer1@example.com')).toBeInTheDocument();
  });

  it('should disable buttons while action is in progress', async () => {
    let resolveUpdate: (value: FloristDelivery) => void;
    const updatePromise = new Promise<FloristDelivery>((resolve) => {
      resolveUpdate = resolve;
    });

    vi.mocked(api.getFloristDeliveries).mockResolvedValue({
      deliveries: [mockDelivery1],
    });
    vi.mocked(api.updateDeliveryStatus).mockReturnValue(updatePromise);

    renderWithRouter(<DeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark Delivered')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mark Delivered'));

    // Buttons should be disabled during action
    await waitFor(() => {
      const missedButton = screen.getByText('Mark Missed');
      expect(missedButton).toBeDisabled();
    });

    // Resolve the promise
    resolveUpdate!({ ...mockDelivery1, status: 'DELIVERED' });

    await waitFor(() => {
      expect(screen.queryByText('customer1@example.com')).not.toBeInTheDocument();
    });
  });
});
