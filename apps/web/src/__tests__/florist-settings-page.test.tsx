/**
 * Feature: florist-settings-page
 * Tests for Florist SettingsPage component
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 *
 * Tests cover:
 * - Loading state renders spinner
 * - Florist info displays correctly (name, status)
 * - Assigned properties list renders
 * - Empty properties state displays correctly
 * - Shopify integration placeholder displays
 * - Error state displays on API failure
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/florist/SettingsPage';
import * as api from '../lib/api';
import type { FloristMeResponse } from '@bloom/shared';

// Mock the API module
vi.mock('../lib/api', () => ({
  getFloristMe: vi.fn(),
}));

// Helper to render with router
function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

// Mock florist data with assigned properties
const mockFloristWithProperties: FloristMeResponse = {
  florist_id: 'florist-1',
  florist_name: 'Bloom & Petal Floristry',
  florist_status: 'READY',
  assigned_properties: [
    {
      property_id: 'prop-1',
      property_name: 'Sunset Apartments',
      property_address: '123 Main St, San Francisco, CA',
    },
    {
      property_id: 'prop-2',
      property_name: 'Harbor View Condos',
      property_address: '456 Ocean Ave, San Francisco, CA',
    },
  ],
};

// Mock florist data without assigned properties
const mockFloristNoProperties: FloristMeResponse = {
  florist_id: 'florist-2',
  florist_name: 'Fresh Flowers Co',
  florist_status: 'ONBOARDING',
  assigned_properties: [],
};

// Mock florist with archived status
const mockFloristArchived: FloristMeResponse = {
  florist_id: 'florist-3',
  florist_name: 'Old Florist Shop',
  florist_status: 'ONBOARDING' as FloristMeResponse['florist_status'],
  assigned_properties: [],
};

describe('FloristSettingsPage - Loading State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should show loading spinner while fetching data', async () => {
    let resolveFlorist: (value: FloristMeResponse) => void;
    const floristPromise = new Promise<FloristMeResponse>((resolve) => {
      resolveFlorist = resolve;
    });

    vi.mocked(api.getFloristMe).mockReturnValue(floristPromise);

    const { container } = renderWithRouter(<SettingsPage />);

    // Should show loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText('Loading settings...')).toBeInTheDocument();

    // Resolve the promise
    resolveFlorist!(mockFloristWithProperties);

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });
});

describe('FloristSettingsPage - Business Information', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display florist business name', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristWithProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Bloom & Petal Floristry')).toBeInTheDocument();
    });
  });

  it('should display READY status badge with green color', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristWithProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const statusBadge = screen.getByText('READY');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('should display ONBOARDING status badge with yellow color', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristNoProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const statusBadge = screen.getByText('ONBOARDING');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });
  });

  it('should display ARCHIVED status badge with gray color', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristArchived);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      const statusBadge = screen.getByText('ARCHIVED');
      expect(statusBadge).toBeInTheDocument();
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });
  });
});

describe('FloristSettingsPage - Assigned Properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display assigned properties list', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristWithProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      // Section header
      expect(screen.getByText('Assigned Properties')).toBeInTheDocument();

      // Property names
      expect(screen.getByText('Sunset Apartments')).toBeInTheDocument();
      expect(screen.getByText('Harbor View Condos')).toBeInTheDocument();

      // Property addresses
      expect(screen.getByText('123 Main St, San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('456 Ocean Ave, San Francisco, CA')).toBeInTheDocument();
    });
  });

  it('should display empty state when no properties assigned', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristNoProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('No properties assigned yet.')).toBeInTheDocument();
      expect(screen.getByText('Contact Bloom admin to get assigned to properties.')).toBeInTheDocument();
    });
  });
});

describe('FloristSettingsPage - Shopify Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display Shopify integration placeholder', async () => {
    vi.mocked(api.getFloristMe).mockResolvedValue(mockFloristWithProperties);

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Shopify Integration')).toBeInTheDocument();
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(
        screen.getByText(/Shopify integration will be available in a future update/)
      ).toBeInTheDocument();
    });
  });
});

describe('FloristSettingsPage - Error State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('should display error message when API fails', async () => {
    const errorMessage = 'Failed to load profile';
    vi.mocked(api.getFloristMe).mockRejectedValue(new Error(errorMessage));

    renderWithRouter(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
