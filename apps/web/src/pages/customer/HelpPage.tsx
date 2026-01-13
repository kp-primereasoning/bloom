/**
 * Customer Help Page
 * 
 * Displays FAQs in an accordion layout.
 * Features:
 * - Page title: "Help"
 * - Subtitle: "Frequently asked questions"
 * - FAQ accordion with single-item expansion
 * - Markdown rendering for answers
 */

import { useEffect, useState } from 'react';
import { getFAQ } from '@/lib/api';
import { FAQAccordion } from '@/components/FAQAccordion';
import type { FAQItem } from '@bloom/shared';

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Card wrapper component for consistent styling
 */
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

/**
 * Loading skeleton for the page
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>

      {/* FAQ items skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function HelpPage() {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch FAQ data on mount
  useEffect(() => {
    async function fetchFAQs() {
      try {
        const response = await getFAQ();
        setFaqs(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FAQs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFAQs();
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Help</h1>
          <p className="text-gray-600">Frequently asked questions</p>
        </Card>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Help</h1>
        <p className="text-gray-600">Frequently asked questions</p>
      </Card>

      {/* FAQ Accordion */}
      <FAQAccordion
        items={faqs}
        expandedId={expandedId}
        onToggle={setExpandedId}
      />
    </div>
  );
}
