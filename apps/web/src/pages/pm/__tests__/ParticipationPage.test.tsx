/**
 * Property-based tests for ParticipationPage resident sorting.
 *
 * Feature: pm-dashboard-v2
 * Property 4: Resident sorting produces correct order
 * Validates: Requirements 2.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sortResidents, type SortField, type SortDirection } from '../ParticipationPage';
import type { ResidentInfo } from '@/lib/api';

// =============================================================================
// Generators
// =============================================================================

const subscriptionStatusArb = fc.constantFrom('CREATED', 'ACTIVE', 'PAUSED') as fc.Arbitrary<
  'CREATED' | 'ACTIVE' | 'PAUSED'
>;

const subscriptionPlanArb = fc.constantFrom('ESSENTIAL', 'SIGNATURE', 'STATEMENT', null);

const unitArb = fc.oneof(
  fc.stringMatching(/^[A-Z]?\d{1,4}[A-Z]?$/),
  fc.constant(null)
);

const residentArb: fc.Arbitrary<ResidentInfo> = fc.record({
  id: fc.uuid(),
  email: fc.emailAddress(),
  unit: unitArb,
  subscription_status: subscriptionStatusArb,
  subscription_plan: subscriptionPlanArb,
});

const residentsArb = fc.array(residentArb, { minLength: 0, maxLength: 50 });

const sortFieldArb: fc.Arbitrary<SortField> = fc.constantFrom(
  'unit',
  'subscription_status',
  'subscription_plan'
);

const sortDirectionArb: fc.Arbitrary<SortDirection> = fc.constantFrom('asc', 'desc');

// =============================================================================
// Property 4: Resident sorting produces correct order
// =============================================================================

describe('Property 4: Resident sorting produces correct order', () => {
  /**
   * **Validates: Requirements 2.4**
   *
   * For any list of residents and any valid sort field + direction,
   * adjacent elements in the sorted result respect the ordering:
   * - Non-null values are ordered by localeCompare (asc) or reverse (desc)
   * - Null values always appear at the end regardless of direction
   */
  it('sorted list has each adjacent pair in correct order', () => {
    fc.assert(
      fc.property(residentsArb, sortFieldArb, sortDirectionArb, (residents, field, direction) => {
        const sorted = sortResidents(residents, field, direction);

        // Length is preserved
        expect(sorted).toHaveLength(residents.length);

        // Check adjacent pair ordering
        for (let i = 0; i < sorted.length - 1; i++) {
          const aVal = sorted[i][field];
          const bVal = sorted[i + 1][field];

          if (aVal === null && bVal === null) {
            // Both null — fine, no ordering constraint between them
            continue;
          }
          if (bVal === null) {
            // Null comes after non-null — always valid
            continue;
          }
          if (aVal === null) {
            // Non-null should not come after null — this is a violation
            expect.unreachable('Null value appeared before non-null value');
          }

          // Both non-null: check ordering
          const cmp = aVal.localeCompare(bVal);
          if (direction === 'asc') {
            expect(cmp).toBeLessThanOrEqual(0);
          } else {
            expect(cmp).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * Sorting does not add or remove elements — it's a permutation of the input.
   */
  it('sorted result is a permutation of the input', () => {
    fc.assert(
      fc.property(residentsArb, sortFieldArb, sortDirectionArb, (residents, field, direction) => {
        const sorted = sortResidents(residents, field, direction);

        expect(sorted).toHaveLength(residents.length);

        const inputIds = residents.map((r) => r.id).sort();
        const sortedIds = sorted.map((r) => r.id).sort();
        expect(sortedIds).toEqual(inputIds);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * Null values in the sort field always appear at the end of the sorted list,
   * regardless of sort direction.
   */
  it('null values always sort to the end', () => {
    fc.assert(
      fc.property(residentsArb, sortFieldArb, sortDirectionArb, (residents, field, direction) => {
        const sorted = sortResidents(residents, field, direction);
        const nullCount = sorted.filter((r) => r[field] === null).length;

        if (nullCount > 0 && nullCount < sorted.length) {
          // All nulls should be at the tail
          const firstNullIdx = sorted.findIndex((r) => r[field] === null);
          for (let i = firstNullIdx; i < sorted.length; i++) {
            expect(sorted[i][field]).toBeNull();
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
