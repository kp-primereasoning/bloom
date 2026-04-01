/**
 * Admin Payouts Page
 *
 * Generate florist payouts based on delivered orders.
 * Payout amounts are calculated from each florist's Shopify tier
 * mapping prices (what the florist actually charges per arrangement).
 */

import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';

interface PayoutItem {
  id: string;
  florist_id: string;
  florist_name: string | null;
  amount_cents: number;
  delivery_count: number;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string | null;
}

interface GenerateResult {
  payouts_created: number;
  total_amount_cents: number;
  total_deliveries: number;
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
      if (result.payouts_created === 0) {
        setSuccess('No delivered orders found in this period.');
      } else {
        setSuccess(
          `Created ${result.payouts_created} payout${result.payouts_created > 1 ? 's' : ''} for ${result.total_deliveries} deliveries totaling ${formatCents(result.total_amount_cents)}`
        );
      }
      await loadPayouts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payouts');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-bloom-dark">Florist Payouts</h1>
        <p className="text-sm text-stone-400 mt-1">
          Calculate payouts based on delivered orders and each florist's product prices.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200/60 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-bloom-sage/10 border border-bloom-sage/30 rounded-lg p-4">
          <p className="text-sm text-bloom-dark">{success}</p>
        </div>
      )}

      {/* Generate */}
      <div className="bg-white rounded-lg border border-stone-200/60 p-6">
        <h2 className="text-[0.9375rem] font-medium text-bloom-dark mb-4">Generate payouts for period</h2>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label htmlFor="period-start" className="block text-sm text-stone-500 mb-1">From</label>
            <input id="period-start" type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label htmlFor="period-end" className="block text-sm text-stone-500 mb-1">To</label>
            <input id="period-end" type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
              className="input-field" />
          </div>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="px-5 py-3 bg-bloom-dark hover:bg-stone-900 text-white rounded-lg text-sm font-medium tracking-wide transition-colors disabled:opacity-40">
            {isGenerating ? 'Calculating...' : 'Calculate & generate'}
          </button>
        </div>
        <p className="text-[0.8125rem] text-stone-400 mt-3">
          Amounts are based on each florist's Shopify tier mapping prices. Unmapped tiers use default rates.
        </p>
      </div>

      {/* History */}
      <div className="bg-white rounded-lg border border-stone-200/60 p-6">
        <h2 className="text-[0.9375rem] font-medium text-bloom-dark mb-4">Payout history</h2>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-4 bg-stone-100 rounded w-full" />)}
          </div>
        ) : payouts.length === 0 ? (
          <p className="text-stone-400 text-sm">No payouts yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Florist</th>
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Deliveries</th>
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Amount</th>
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Period</th>
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Status</th>
                  <th className="text-left py-2 text-stone-500 font-medium text-[0.8125rem]">Created</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-stone-100">
                    <td className="py-3 text-bloom-dark">{p.florist_name || p.florist_id.slice(0, 8) + '...'}</td>
                    <td className="py-3 text-stone-600">{p.delivery_count || '—'}</td>
                    <td className="py-3 text-bloom-dark font-medium">{formatCents(p.amount_cents)}</td>
                    <td className="py-3 text-stone-500">{formatDate(p.period_start)} – {formatDate(p.period_end)}</td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        p.status === 'COMPLETED' ? 'bg-bloom-sage/15 text-bloom-dark' :
                        p.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-stone-500">{formatDate(p.created_at)}</td>
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
