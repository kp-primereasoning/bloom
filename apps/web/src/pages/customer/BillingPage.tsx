/**
 * Customer Billing Page
 *
 * Displays payment method on file, invoice history, and current plan cost.
 * Integrates with Stripe Elements for card collection via SetupIntent.
 */

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  getPaymentMethod,
  getInvoices,
  createSetupIntent,
  updatePaymentMethod,
  type PaymentMethodInfo,
  type InvoiceItem,
} from '@/lib/api';

// ── Stripe setup ────────────────────────────────────────────────────

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

// ── Helpers ─────────────────────────────────────────────────────────

function formatCents(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    paid: 'bg-bloom-sage/15 text-green-800',
    open: 'bg-yellow-100 text-yellow-800',
    draft: 'bg-gray-100 text-gray-600',
    void: 'bg-red-100 text-red-700',
    uncollectible: 'bg-red-100 text-red-700',
  };
  const cls = colors[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>
      {status}
    </span>
  );
}

// ── Card wrapper ────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}


// ── Card Setup Form (uses Stripe hooks) ─────────────────────────────

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1f2937',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#dc2626' },
  },
};

interface CardSetupFormProps {
  onSuccess: (pm: PaymentMethodInfo) => void;
  onCancel: () => void;
}

function CardSetupForm({ onSuccess, onCancel }: CardSetupFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create a SetupIntent on the backend
      const { client_secret } = await createSetupIntent();

      // 2. Confirm the SetupIntent with the CardElement
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError('Card element not found');
        setIsSubmitting(false);
        return;
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        setError(stripeError.message ?? 'Card setup failed');
        setIsSubmitting(false);
        return;
      }

      // 3. Set the new payment method as default on the backend
      if (setupIntent?.payment_method) {
        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
        const pm = await updatePaymentMethod(pmId);
        onSuccess(pm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-300 rounded-md p-3">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save card'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}


// ── Inner page (rendered inside Elements provider) ──────────────────

function BillingPageInner() {
  const location = useLocation();
  const needsPaymentMethod =
    (location.state as { needsPaymentMethod?: boolean } | null)?.needsPaymentMethod ?? false;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodInfo | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pm, inv] = await Promise.all([getPaymentMethod(), getInvoices()]);
        setPaymentMethod(pm);
        setInvoices(inv);
        // Auto-open card form when redirected from subscription page
        if (!pm && needsPaymentMethod) setShowCardForm(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load billing data');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [needsPaymentMethod]);

  const handleCardSuccess = useCallback((pm: PaymentMethodInfo) => {
    setPaymentMethod(pm);
    setShowCardForm(false);
    setError(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-64" />
        </Card>
        <Card className="p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Billing</h1>

      {needsPaymentMethod && !paymentMethod && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <p className="text-sm text-amber-800">
            Please add a payment method before activating your subscription.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Method Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

        {showCardForm ? (
          <CardSetupForm
            onSuccess={handleCardSuccess}
            onCancel={() => setShowCardForm(false)}
          />
        ) : paymentMethod ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center text-xs font-medium text-gray-600 uppercase">
                {paymentMethod.brand}
              </div>
              <div>
                <p className="text-gray-900">•••• {paymentMethod.last4}</p>
                <p className="text-sm text-gray-500">
                  Expires {paymentMethod.exp_month}/{paymentMethod.exp_year}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCardForm(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Update card
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-3">No payment method on file.</p>
            <button
              onClick={() => setShowCardForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Add payment method
            </button>
          </div>
        )}
      </Card>

      {/* Invoice History */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice History</h2>
        {invoices.length === 0 ? (
          <p className="text-gray-500">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-600 font-medium">Date</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Amount</th>
                  <th className="text-left py-2 text-gray-600 font-medium">Status</th>
                  <th className="text-right py-2 text-gray-600 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900">{formatTimestamp(inv.created)}</td>
                    <td className="py-3 text-gray-900">
                      {formatCents(inv.amount_cents, inv.currency)}
                    </td>
                    <td className="py-3">{statusBadge(inv.status)}</td>
                    <td className="py-3 text-right">
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Exported wrapper with Stripe Elements provider ──────────────────

export function BillingPage() {
  if (!stripePromise) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-sm text-yellow-800">
            Stripe is not configured. Set <code>VITE_STRIPE_PUBLISHABLE_KEY</code> in your
            environment to enable billing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <BillingPageInner />
    </Elements>
  );
}
