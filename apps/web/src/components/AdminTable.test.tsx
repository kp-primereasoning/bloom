/**
 * Property-based tests for AdminTable selection behavior.
 * 
 * Feature: property-selection-actions
 * Property 1: Single Selection Invariant
 * Validates: Requirements 1.2, 1.3, 1.4
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { AdminTable, type Column } from './AdminTable';

interface TestItem {
  id: string;
  name: string;
}

const testColumns: Column<TestItem>[] = [
  { key: 'name', header: 'Name' },
];

// Clean up after each test
afterEach(() => {
  cleanup();
});

describe('AdminTable Selection', () => {
  /**
   * Property 1: Single Selection Invariant
   * For any sequence of selection actions on the Properties table,
   * at most one property SHALL be selected at any time.
   * 
   * **Validates: Requirements 1.2, 1.3, 1.4**
   */
  it('should maintain single selection invariant across any sequence of clicks', () => {
    fc.assert(
      fc.property(
        // Generate 2-5 items
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        // Generate a sequence of click indices (0 to n-1)
        fc.array(fc.nat({ max: 4 }), { minLength: 1, maxLength: 10 }),
        (itemIds, clickSequence) => {
          // Clean up before each iteration
          cleanup();
          
          const uniqueIds = [...new Set(itemIds)];
          if (uniqueIds.length < 2) return true; // Skip if not enough unique items
          
          const items: TestItem[] = uniqueIds.map(id => ({ id, name: `Item ${id}` }));
          let currentSelection: string | null = null;
          
          const handleSelect = (id: string | null) => {
            currentSelection = id;
          };
          
          const { rerender } = render(
            <AdminTable
              columns={testColumns}
              data={items}
              loading={false}
              error={null}
              keyField="id"
              selectable={true}
              selectedId={currentSelection}
              onSelect={handleSelect}
            />
          );
          
          // Simulate click sequence
          for (const clickIdx of clickSequence) {
            const actualIdx = clickIdx % items.length;
            const checkboxes = screen.getAllByRole('checkbox');
            
            fireEvent.click(checkboxes[actualIdx]);
            
            // Rerender with new selection state
            rerender(
              <AdminTable
                columns={testColumns}
                data={items}
                loading={false}
                error={null}
                keyField="id"
                selectable={true}
                selectedId={currentSelection}
                onSelect={handleSelect}
              />
            );
            
            // INVARIANT: At most one checkbox should be checked
            const checkedBoxes = screen.getAllByRole('checkbox').filter(
              (cb) => (cb as HTMLInputElement).checked
            );
            expect(checkedBoxes.length).toBeLessThanOrEqual(1);
          }
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property 3: Selection Toggle Idempotence
   * For any property, clicking its checkbox twice (select then deselect)
   * SHALL return the UI to its initial state with no property selected.
   * 
   * **Validates: Requirements 1.3, 1.4**
   */
  it('should return to initial state after double-click on same item', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        fc.nat({ max: 4 }),
        (itemIds, targetIdx) => {
          const uniqueIds = [...new Set(itemIds)];
          if (uniqueIds.length < 2) return true; // Need at least 2 items
          
          const items: TestItem[] = uniqueIds.map(id => ({ id, name: `Item ${id}` }));
          const actualIdx = targetIdx % items.length;
          let currentSelection: string | null = null;
          
          const handleSelect = (id: string | null) => {
            currentSelection = id;
          };
          
          const { rerender } = render(
            <AdminTable
              columns={testColumns}
              data={items}
              loading={false}
              error={null}
              keyField="id"
              selectable={true}
              selectedId={currentSelection}
              onSelect={handleSelect}
            />
          );
          
          const checkboxes = screen.getAllByRole('checkbox');
          
          // First click - select
          fireEvent.click(checkboxes[actualIdx]);
          // currentSelection is now updated by handleSelect
          
          rerender(
            <AdminTable
              columns={testColumns}
              data={items}
              loading={false}
              error={null}
              keyField="id"
              selectable={true}
              selectedId={currentSelection}
              onSelect={handleSelect}
            />
          );
          
          // Second click - deselect
          const checkboxesAfter = screen.getAllByRole('checkbox');
          fireEvent.click(checkboxesAfter[actualIdx]);
          
          // Should be back to null (no selection)
          expect(currentSelection).toBeNull();
          
          return true;
        }
      ),
      { numRuns: 20 }
    );
  });

  // Unit test: checkbox column only appears when selectable is true
  it('should not show checkbox column when selectable is false', () => {
    const items: TestItem[] = [{ id: '1', name: 'Test' }];
    
    render(
      <AdminTable
        columns={testColumns}
        data={items}
        loading={false}
        error={null}
        keyField="id"
        selectable={false}
      />
    );
    
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('should show checkbox column when selectable is true', () => {
    const items: TestItem[] = [{ id: '1', name: 'Test' }];
    
    render(
      <AdminTable
        columns={testColumns}
        data={items}
        loading={false}
        error={null}
        keyField="id"
        selectable={true}
        selectedId={null}
        onSelect={() => {}}
      />
    );
    
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('should highlight selected row with indigo background', () => {
    const items: TestItem[] = [
      { id: '1', name: 'Test 1' },
      { id: '2', name: 'Test 2' },
    ];
    
    render(
      <AdminTable
        columns={testColumns}
        data={items}
        loading={false}
        error={null}
        keyField="id"
        selectable={true}
        selectedId="1"
        onSelect={() => {}}
      />
    );
    
    const rows = screen.getAllByRole('row');
    // First row is header, second is selected item
    expect(rows[1]).toHaveClass('bg-bloom-sage/10');
    expect(rows[2]).not.toHaveClass('bg-bloom-sage/10');
  });
});
