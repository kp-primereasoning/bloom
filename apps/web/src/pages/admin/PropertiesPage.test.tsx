/**
 * Property-based tests for PropertiesPage action bar state consistency.
 * 
 * Feature: property-selection-actions
 * Property 2: Action Bar State Consistency
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import * as fc from 'fast-check';
import { PropertiesPage } from './PropertiesPage';
import type { EnrichedProperty } from '@bloom/shared';
import { PropertyStatus } from '@bloom/shared';

// Mock the api module
const mockApiRequest = vi.fn();
vi.mock('@/lib/api', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}));

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Generate test properties
const generateProperty = (id: string, name: string): EnrichedProperty => ({
  id,
  name,
  address: `${name} Address`,
  status: PropertyStatus.CREATED,
  delivery_cadence: null,
  total_users: 0,
  active_users: 0,
  florist_name: null,
  property_manager_email: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

describe('PropertiesPage Action Bar', () => {
  /**
   * Property 2: Action Bar State Consistency
   * For any selection state, the Action Bar SHALL display "Add Property" if and only if
   * no property is selected, and SHALL display "Edit Property", "Assign Florist", "Assign PM"
   * if and only if a property is selected.
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   */
  it('should show Add Property when no selection, action buttons when selected', async () => {
    const properties = [
      generateProperty('1', 'Property A'),
      generateProperty('2', 'Property B'),
    ];
    
    mockApiRequest.mockResolvedValue(properties);
    
    render(<PropertiesPage />);
    
    // Wait for properties to load
    await waitFor(() => {
      expect(screen.getByText('Property A')).toBeInTheDocument();
    });
    
    // Initially no selection - should show Add Property
    expect(screen.getByText(/Add Property/)).toBeInTheDocument();
    expect(screen.queryByText(/Edit Property/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign Florist/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign PM/)).not.toBeInTheDocument();
    
    // Select a property
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Should now show action buttons, not Add Property
    expect(screen.queryByText(/Add Property/)).not.toBeInTheDocument();
    expect(screen.getByText(/Edit Property/)).toBeInTheDocument();
    expect(screen.getByText(/Assign Florist/)).toBeInTheDocument();
    expect(screen.getByText(/Assign PM/)).toBeInTheDocument();
    
    // Deselect the property
    fireEvent.click(checkboxes[0]);
    
    // Should return to showing Add Property
    expect(screen.getByText(/Add Property/)).toBeInTheDocument();
    expect(screen.queryByText(/Edit Property/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign Florist/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign PM/)).not.toBeInTheDocument();
  });

  it('should display selected property name in action bar', async () => {
    const properties = [
      generateProperty('1', 'Sunset Towers'),
      generateProperty('2', 'Ocean View'),
    ];
    
    mockApiRequest.mockResolvedValue(properties);
    
    render(<PropertiesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Sunset Towers')).toBeInTheDocument();
    });
    
    // Select first property
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Should show selected property name
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
    expect(screen.getAllByText('Sunset Towers').length).toBeGreaterThan(0);
    
    // Select second property
    fireEvent.click(checkboxes[1]);
    
    // Should show new selected property name
    expect(screen.getAllByText('Ocean View').length).toBeGreaterThan(0);
  });

  /**
   * Property test: Action bar state is always consistent with selection
   */
  it('should maintain action bar consistency across selection sequences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.nat({ max: 4 }), { minLength: 1, maxLength: 10 }),
        async (clickSequence) => {
          cleanup();
          
          const properties = [
            generateProperty('1', 'Prop A'),
            generateProperty('2', 'Prop B'),
            generateProperty('3', 'Prop C'),
          ];
          
          mockApiRequest.mockResolvedValue(properties);
          
          render(<PropertiesPage />);
          
          await waitFor(() => {
            expect(screen.getByText('Prop A')).toBeInTheDocument();
          });
          
          let currentSelection: string | null = null;
          
          for (const clickIdx of clickSequence) {
            const actualIdx = clickIdx % properties.length;
            const checkboxes = screen.getAllByRole('checkbox');
            
            fireEvent.click(checkboxes[actualIdx]);
            
            // Determine new selection state
            const clickedId = properties[actualIdx].id;
            if (currentSelection === clickedId) {
              currentSelection = null;
            } else {
              currentSelection = clickedId;
            }
            
            // INVARIANT: Action bar state must match selection state
            if (currentSelection === null) {
              expect(screen.getByText(/Add Property/)).toBeInTheDocument();
              expect(screen.queryByText(/Edit Property/)).not.toBeInTheDocument();
            } else {
              expect(screen.queryByText(/Add Property/)).not.toBeInTheDocument();
              expect(screen.getByText(/Edit Property/)).toBeInTheDocument();
              expect(screen.getByText(/Assign Florist/)).toBeInTheDocument();
              expect(screen.getByText(/Assign PM/)).toBeInTheDocument();
            }
          }
          
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
