/**
 * Property-based tests for EditPropertyModal data integrity.
 * 
 * Feature: property-selection-actions
 * Property 4: Edit Modal Data Integrity
 * Validates: Requirements 3.1, 3.2
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { EditPropertyModal } from './EditPropertyModal';
import type { EnrichedProperty } from '@bloom/shared';
import { PropertyStatus } from '@bloom/shared';

// Mock the api module
vi.mock('@/lib/api', () => ({
  apiRequest: vi.fn(),
}));

// Clean up after each test
afterEach(() => {
  cleanup();
});

describe('EditPropertyModal Data Integrity', () => {
  /**
   * Property 4: Edit Modal Data Integrity
   * For any property, opening the Edit modal SHALL display the exact current
   * values of name, address, and delivery_cadence from the selected property.
   * 
   * **Validates: Requirements 3.1, 3.2**
   */
  it('should pre-populate form with exact property values', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          name: fc.stringMatching(/^[a-zA-Z0-9 ]{1,50}$/),
          address: fc.stringMatching(/^[a-zA-Z0-9 ]{1,100}$/),
          delivery_cadence: fc.option(fc.stringMatching(/^[a-z]{1,20}$/), { nil: null }),
          status: fc.constantFrom(
            PropertyStatus.CREATED,
            PropertyStatus.PENDING_FLORIST,
            PropertyStatus.PENDING_PM,
            PropertyStatus.ACTIVE
          ),
          total_users: fc.nat({ max: 1000 }),
          active_users: fc.nat({ max: 1000 }),
          florist_name: fc.option(fc.string(), { nil: null }),
          property_manager_email: fc.option(fc.emailAddress(), { nil: null }),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString()),
        }),
        (property: EnrichedProperty) => {
          // Clean up before each iteration
          cleanup();
          
          render(
            <EditPropertyModal
              isOpen={true}
              onClose={() => {}}
              property={property}
              onSuccess={() => {}}
            />
          );
          
          // Check name field is pre-populated (use id selector for precision)
          const nameInput = document.getElementById('name') as HTMLInputElement;
          expect(nameInput.value).toBe(property.name);
          
          // Check address field is pre-populated
          const addressInput = document.getElementById('address') as HTMLInputElement;
          expect(addressInput.value).toBe(property.address);
          
          // Check delivery cadence field is pre-populated (or empty if null)
          const cadenceInput = document.getElementById('deliveryCadence') as HTMLInputElement;
          expect(cadenceInput.value).toBe(property.delivery_cadence || '');
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Unit test: modal shows all three editable fields
  it('should display name, address, and delivery cadence fields', () => {
    const property: EnrichedProperty = {
      id: '123',
      name: 'Test Property',
      address: '123 Test St',
      delivery_cadence: 'weekly',
      status: PropertyStatus.CREATED,
      total_users: 0,
      active_users: 0,
      florist_name: null,
      property_manager_email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <EditPropertyModal
        isOpen={true}
        onClose={() => {}}
        property={property}
        onSuccess={() => {}}
      />
    );

    expect(document.getElementById('name')).toBeInTheDocument();
    expect(document.getElementById('address')).toBeInTheDocument();
    expect(document.getElementById('deliveryCadence')).toBeInTheDocument();
  });

  // Unit test: modal not rendered when closed
  it('should not render when isOpen is false', () => {
    const property: EnrichedProperty = {
      id: '123',
      name: 'Test Property',
      address: '123 Test St',
      delivery_cadence: null,
      status: PropertyStatus.CREATED,
      total_users: 0,
      active_users: 0,
      florist_name: null,
      property_manager_email: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <EditPropertyModal
        isOpen={false}
        onClose={() => {}}
        property={property}
        onSuccess={() => {}}
      />
    );

    expect(screen.queryByText('Edit Property')).not.toBeInTheDocument();
  });
});
