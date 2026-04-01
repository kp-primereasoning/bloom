/**
 * Property Manager Participation Page
 *
 * Displays list of residents at the PM's property with their subscription status,
 * plan distribution summary cards, and sortable resident table.
 */

import { useState, useEffect, useMemo } from 'react';
import { getPMResidents, type PMResidentsResponse, type ResidentInfo } from '@/lib/api';

// =============================================================================
// Sort types and pure sort function (exported for testing)
// =============================================================================

export type SortField = 'unit' | 'subscription_status' | 'subscription_plan';
export type SortDirection = 'asc' | 'desc';

/**
 * Pure function to sort residents by a given field and direction.
 * Null values sort after non-null values regardless of direction.
 */
export function sortResidents(
  residents: ResidentInfo[],
  field: SortField,
  direction: SortDirection
): ResidentInfo[] {
  return [...residents].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    // Null handling: nulls always sort to the end
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    const cmp = aVal.localeCompare(bVal);
    return direction === 'asc' ? cmp : -cmp;
  });
}

// =============================================================================
// Badge helpers
// =============================================================================

function getStatusBadge(status: string): { color: string; label: string } {
  switch (status) {
    case 'ACTIVE':
      return { color: 'bg-bloom-sage/15 text-green-800', label: 'Active' };
    case 'PAUSED':
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Paused' };
    case 'CREATED':
      return { color: 'bg-blue-100 text-blue-800', label: 'Pending' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: status };
  }
}

function getPlanBadge(plan: string | null): { color: string; label: string } {
  if (!plan) {
    return { color: 'bg-gray-100 text-gray-500', label: 'No plan' };
  }
  switch (plan) {
    case 'ESSENTIAL':
      return { color: 'bg-gray-100 text-gray-800', label: 'Essential' };
    case 'SIGNATURE':
      return { color: 'bg-blue-100 text-blue-800', label: 'Signature' };
    case 'STATEMENT':
      return { color: 'bg-purple-100 text-purple-800', label: 'Statement' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: plan };
  }
}


// =============================================================================
// Sort header component
// =============================================================================

function SortableHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;
  const indicator = isActive ? (currentDirection === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
      onClick={() => onSort(field)}
      aria-sort={isActive ? (currentDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}{indicator}
    </th>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function ParticipationPage() {
  const [data, setData] = useState<PMResidentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'ACTIVE' | 'PAUSED' | 'CREATED'>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    async function fetchResidents() {
      try {
        setLoading(true);
        setError(null);
        const response = await getPMResidents();
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load residents');
      } finally {
        setLoading(false);
      }
    }
    fetchResidents();
  }, []);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter then sort residents
  const displayedResidents = useMemo(() => {
    const filtered =
      data?.residents.filter((r) =>
        filter === 'all' ? true : r.subscription_status === filter
      ) || [];

    if (!sortField) return filtered;
    return sortResidents(filtered, sortField, sortDirection);
  }, [data?.residents, filter, sortField, sortDirection]);

  // Count by status
  const statusCounts = {
    all: data?.residents.length || 0,
    ACTIVE: data?.residents.filter((r) => r.subscription_status === 'ACTIVE').length || 0,
    PAUSED: data?.residents.filter((r) => r.subscription_status === 'PAUSED').length || 0,
    CREATED: data?.residents.filter((r) => r.subscription_status === 'CREATED').length || 0,
  };

  // Participation rate
  const participationRate =
    statusCounts.all > 0
      ? Math.round((statusCounts.ACTIVE / statusCounts.all) * 100)
      : 0;

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bloom-sage" />
              <p className="text-gray-500 text-sm">Loading residents...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (data?.residents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Participation</h1>
          <p className="text-gray-500">
            Track resident participation in the floral subscription program
            {data?.property_name && <span> at <strong>{data.property_name}</strong></span>}.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No residents are enrolled at this property yet.</p>
        </div>
      </div>
    );
  }

  const planDist = data?.plan_distribution;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Participation</h1>
        <p className="text-gray-500">
          Track resident participation in the floral subscription program
          {data?.property_name && <span> at <strong>{data.property_name}</strong></span>}.
        </p>
      </div>

      {/* Plan Distribution Summary Cards */}
      {planDist && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Essential</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{planDist.essential}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Signature</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">{planDist.signature}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">Statement</p>
            <p className="text-2xl font-semibold text-purple-700 mt-1">{planDist.statement}</p>
          </div>
        </div>
      )}

      {/* Participation Rate */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-500">Participation Rate</p>
          <p className="text-sm font-semibold text-gray-900">{participationRate}%</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-bloom-dark h-2.5 rounded-full transition-all"
            style={{ width: `${participationRate}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-bloom-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'ACTIVE'
                ? 'bg-bloom-dark text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Active ({statusCounts.ACTIVE})
          </button>
          <button
            onClick={() => setFilter('PAUSED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'PAUSED'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Paused ({statusCounts.PAUSED})
          </button>
          <button
            onClick={() => setFilter('CREATED')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'CREATED'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({statusCounts.CREATED})
          </button>
        </div>
      </div>

      {/* Residents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {displayedResidents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No residents match the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resident
                  </th>
                  <SortableHeader
                    label="Unit"
                    field="unit"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="subscription_status"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Plan"
                    field="subscription_plan"
                    currentField={sortField}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayedResidents.map((resident: ResidentInfo) => {
                  const statusBadge = getStatusBadge(resident.subscription_status);
                  const planBadge = getPlanBadge(resident.subscription_plan);
                  return (
                    <tr key={resident.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{resident.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {resident.unit || <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${planBadge.color}`}>
                          {planBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}