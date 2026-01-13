/**
 * FAQ Accordion Component
 * 
 * Displays FAQ items in an accordion layout with single-item expansion.
 * Features:
 * - Only one item expanded at a time
 * - Smooth CSS transitions for expand/collapse
 * - Markdown rendering for answers (bold, links, mailto)
 */

import { useState, useRef, useEffect } from 'react';
import type { FAQItem } from '@bloom/shared';

// =============================================================================
// Markdown Renderer
// =============================================================================

/**
 * Simple markdown renderer for FAQ answers.
 * Supports: **bold**, [text](url), mailto links
 */
function renderMarkdown(markdown: string): React.ReactNode {
  // Split by markdown patterns and render
  const parts: React.ReactNode[] = [];
  let remaining = markdown;
  let key = 0;

  while (remaining.length > 0) {
    // Check for bold: **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [, text, url] = linkMatch;
      parts.push(
        <a
          key={key++}
          href={url}
          className="text-emerald-600 hover:text-emerald-700 underline"
          target={url.startsWith('mailto:') ? undefined : '_blank'}
          rel={url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
        >
          {text}
        </a>
      );
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Find next special character
    const nextBold = remaining.indexOf('**');
    const nextLink = remaining.indexOf('[');
    
    let nextSpecial = remaining.length;
    if (nextBold !== -1 && nextBold < nextSpecial) nextSpecial = nextBold;
    if (nextLink !== -1 && nextLink < nextSpecial) nextSpecial = nextLink;

    // Add plain text up to next special character
    if (nextSpecial > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    } else if (remaining.length > 0) {
      // No more special characters, add remaining text
      parts.push(<span key={key++}>{remaining}</span>);
      remaining = '';
    }
  }

  return <>{parts}</>;
}

// =============================================================================
// Accordion Item Component
// =============================================================================

interface AccordionItemProps {
  item: FAQItem;
  isExpanded: boolean;
  onToggle: () => void;
}

function AccordionItem({ item, isExpanded, onToggle }: AccordionItemProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  // Update height when expanded state changes
  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Question header - clickable */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-gray-900 font-medium pr-4">{item.question}</span>
        <span
          className={`text-gray-400 transition-transform duration-200 flex-shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Answer content - animated */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ height: `${height}px` }}
      >
        <div ref={contentRef} className="px-6 pb-4 pt-0">
          <div className="text-gray-600 leading-relaxed">
            {renderMarkdown(item.answer_markdown)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// FAQ Accordion Component
// =============================================================================

interface FAQAccordionProps {
  items: FAQItem[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}

export function FAQAccordion({ items, expandedId, onToggle }: FAQAccordionProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No FAQs available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AccordionItem
          key={item.id}
          item={item}
          isExpanded={expandedId === item.id}
          onToggle={() => onToggle(expandedId === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
}

// Export for testing
export { renderMarkdown };
