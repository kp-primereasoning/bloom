/**
 * Admin Payouts Page
 *
 * Allows admins to generate florist payouts for a date range
 * and view payout history.
 */

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface PayoutItem {
  id: string;
  florist_id: string;
  amount_cents: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
}

interface GenerateResult {
  payouts_created: number;
  total_amount_cents: number;
  details: PayoutItem[];
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Date range for generation (default: last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [periodStart, setPeriodStart] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [periodEnd, setPeriodEnd] = useState(now.toISOString().split('T')[0]);

  const loadPayouts = async () => {
    try {
      const data = await apiRequest<PayoutItem[]>('/admin/payouts/');
      setPayouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadPayouts(); }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiRequest<GenerateResult>('/admin/payouts/generate', {
        method: 'POST',
        body: JSON.stringify({
          period_start: new Date(periodStart).toISOString(),
          period_end: new Date(periodEnd).toISOString(),
        }),
      });
      setSuccess(`Created ${result.payouts_created} payouts totaling ${formatCents(result.total_amount_cents)}`);
      await loadPayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payouts');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Florist Payouts</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Generate Payouts */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Payouts</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label htmlFor="period-start" className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              id="period-start"
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="period-end" className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              id="period-end"
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payout History</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-4 bg-gray-200 rounded w-full" />)}
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-gray-500">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Florist ID</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Amount</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Period</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Status</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900 font-mono text-xs">{p.florist_id.slice(0, 8)}...</td>
                    <td className="py-3 text-gray-900">{formatCents(p.amount_cents)}</td>
                    <td className="py-3 text-gray-600">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        p.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        p.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
