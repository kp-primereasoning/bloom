/**
 * Reusable admin table component for displaying entity lists.
 * Supports optional row selection with checkbox column.
 */

import { LoadingSpinner } from './LoadingSpinner';

export interface Column<T> {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading: boolean;
  error: string | null;
  keyField: keyof T;
  /** Enable row selection with checkbox column */
  selectable?: boolean;
  /** Currently selected row ID (single selection) */
  selectedId?: string | null;
  /** Callback when selection changes */
  onSelect?: (id: string | null) => void;
}

export function AdminTable<T>({ 
  columns, 
  data, 
  loading, 
  error, 
  keyField,
  selectable = false,
  selectedId = null,
  onSelect,
}: AdminTableProps<T>) {
  
  const handleRowSelect = (rowId: string) => {
    if (!onSelect) return;
    // Toggle selection: if already selected, deselect; otherwise select
    onSelect(selectedId === rowId ? null : rowId);
  };
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500">No items found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {selectable && (
              <th className="px-2 py-3 w-8">
                <span className="sr-only">Select</span>
              </th>
            )}
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row) => {
            const rowId = String(row[keyField]);
            const isSelected = selectedId === rowId;
            return (
              <tr 
                key={rowId} 
                className={`${isSelected ? 'bg-bloom-sage/10' : 'hover:bg-gray-50'}`}
              >
                {selectable && (
                  <td className="px-2 py-4 whitespace-nowrap w-8">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRowSelect(rowId)}
                      className="h-4 w-4 text-bloom-sage focus:ring-bloom-sage border-gray-300 rounded cursor-pointer"
                      aria-label={`Select row ${rowId}`}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
