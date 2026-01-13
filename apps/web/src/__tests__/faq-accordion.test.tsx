/**
 * Feature: customer-help-faq
 * Property 2: Single-Item Expansion Invariant
 * Property 4: Markdown Link Rendering
 * Validates: Requirements 4.3, 4.5, 5.1
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { FAQAccordion, renderMarkdown } from '../components/FAQAccordion';
import type { FAQItem } from '@bloom/shared';

// =============================================================================
// Arbitraries
// =============================================================================

// Arbitrary for generating FAQ item IDs
const faqIdArbitrary = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_'.split('')),
  { minLength: 1, maxLength: 20 }
);

// Arbitrary for generating FAQ items
const faqItemArbitrary = fc.record({
  id: faqIdArbitrary,
  question: fc.string({ minLength: 1, maxLength: 100 }),
  answer_markdown: fc.string({ minLength: 1, maxLength: 500 }),
});

// Arbitrary for generating a list of FAQ items with unique IDs
const faqItemsArbitrary = fc.array(faqItemArbitrary, { minLength: 1, maxLength: 10 })
  .map(items => {
    // Ensure unique IDs
    const seen = new Set<string>();
    return items.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  })
  .filter(items => items.length > 0);

// Arbitrary for generating click sequences (indices into items array)
const clickSequenceArbitrary = (maxIndex: number) =>
  fc.array(fc.integer({ min: 0, max: maxIndex }), { minLength: 1, maxLength: 20 });

// =============================================================================
// Property 2: Single-Item Expansion Invariant
// =============================================================================

describe('FAQAccordion - Property 2: Single-Item Expansion Invariant', () => {
  afterEach(() => {
    cleanup();
  });

  it('should have at most one item expanded at any time after any sequence of clicks', () => {
    fc.assert(
      fc.property(faqItemsArbitrary, (items) => {
        // Skip if no items
        if (items.length === 0) return true;

        cleanup();
        let expandedId: string | null = null;
        const onToggle = vi.fn((id: string | null) => {
          expandedId = id;
        });

        const { rerender } = render(
          <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
        );

        // Generate a random sequence of clicks
        const clickCount = Math.floor(Math.random() * 10) + 1;
        
        for (let i = 0; i < clickCount; i++) {
          const randomIndex = Math.floor(Math.random() * items.length);
          const buttons = screen.getAllByRole('button');
          
          if (buttons[randomIndex]) {
            fireEvent.click(buttons[randomIndex]);
            
            // Get the new expandedId from the mock
            const lastCall = onToggle.mock.calls[onToggle.mock.calls.length - 1];
            expandedId = lastCall ? lastCall[0] : null;
            
            // Rerender with new state
            rerender(
              <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
            );
          }
        }

        // Verify invariant: at most one item is expanded
        const expandedButtons = screen.getAllByRole('button')
          .filter(btn => btn.getAttribute('aria-expanded') === 'true');
        
        expect(expandedButtons.length).toBeLessThanOrEqual(1);

        cleanup();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should collapse previously expanded item when expanding a new one', () => {
    const items: FAQItem[] = [
      { id: 'item-1', question: 'Question 1?', answer_markdown: 'Answer 1' },
      { id: 'item-2', question: 'Question 2?', answer_markdown: 'Answer 2' },
      { id: 'item-3', question: 'Question 3?', answer_markdown: 'Answer 3' },
    ];

    let expandedId: string | null = null;
    const onToggle = vi.fn((id: string | null) => {
      expandedId = id;
    });

    const { rerender } = render(
      <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
    );

    // Click first item to expand
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expandedId = onToggle.mock.calls[0][0];
    
    rerender(
      <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
    );

    // Verify first item is expanded
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');

    // Click second item
    fireEvent.click(buttons[1]);
    expandedId = onToggle.mock.calls[1][0];
    
    rerender(
      <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
    );

    // Verify only second item is expanded
    const updatedButtons = screen.getAllByRole('button');
    expect(updatedButtons[0].getAttribute('aria-expanded')).toBe('false');
    expect(updatedButtons[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('should collapse item when clicking on already expanded item', () => {
    const items: FAQItem[] = [
      { id: 'item-1', question: 'Question 1?', answer_markdown: 'Answer 1' },
    ];

    let expandedId: string | null = null;
    const onToggle = vi.fn((id: string | null) => {
      expandedId = id;
    });

    const { rerender } = render(
      <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
    );

    const button = screen.getByRole('button');

    // Click to expand
    fireEvent.click(button);
    expandedId = onToggle.mock.calls[0][0];
    expect(expandedId).toBe('item-1');

    rerender(
      <FAQAccordion items={items} expandedId={expandedId} onToggle={onToggle} />
    );

    // Click again to collapse
    fireEvent.click(button);
    expandedId = onToggle.mock.calls[1][0];
    expect(expandedId).toBeNull();
  });
});

// =============================================================================
// Property 4: Markdown Link Rendering
// =============================================================================

describe('FAQAccordion - Property 4: Markdown Link Rendering', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render bold text correctly', () => {
    const items: FAQItem[] = [
      { id: 'bold-test', question: 'Bold test?', answer_markdown: 'This is **bold** text.' },
    ];

    render(
      <FAQAccordion items={items} expandedId="bold-test" onToggle={() => {}} />
    );

    const strongElement = document.querySelector('strong');
    expect(strongElement).not.toBeNull();
    expect(strongElement?.textContent).toBe('bold');
  });

  it('should render links with correct href', () => {
    const items: FAQItem[] = [
      { id: 'link-test', question: 'Link test?', answer_markdown: 'Visit [our site](https://example.com) for more.' },
    ];

    render(
      <FAQAccordion items={items} expandedId="link-test" onToggle={() => {}} />
    );

    const linkElement = document.querySelector('a');
    expect(linkElement).not.toBeNull();
    expect(linkElement?.getAttribute('href')).toBe('https://example.com');
    expect(linkElement?.textContent).toBe('our site');
  });

  it('should render mailto links correctly', () => {
    const items: FAQItem[] = [
      { 
        id: 'mailto-test', 
        question: 'Contact test?', 
        answer_markdown: 'Email us at [support@bloom.com](mailto:support@bloom.com?subject=Help).' 
      },
    ];

    render(
      <FAQAccordion items={items} expandedId="mailto-test" onToggle={() => {}} />
    );

    const linkElement = document.querySelector('a');
    expect(linkElement).not.toBeNull();
    expect(linkElement?.getAttribute('href')).toBe('mailto:support@bloom.com?subject=Help');
    expect(linkElement?.textContent).toBe('support@bloom.com');
  });

  it('should render mailto links without target="_blank"', () => {
    const items: FAQItem[] = [
      { 
        id: 'mailto-target-test', 
        question: 'Mailto target test?', 
        answer_markdown: 'Email [test@test.com](mailto:test@test.com).' 
      },
    ];

    render(
      <FAQAccordion items={items} expandedId="mailto-target-test" onToggle={() => {}} />
    );

    const linkElement = document.querySelector('a');
    expect(linkElement).not.toBeNull();
    expect(linkElement?.getAttribute('target')).toBeNull();
  });

  it('should render external links with target="_blank"', () => {
    const items: FAQItem[] = [
      { 
        id: 'external-test', 
        question: 'External link test?', 
        answer_markdown: 'Visit [Google](https://google.com).' 
      },
    ];

    render(
      <FAQAccordion items={items} expandedId="external-test" onToggle={() => {}} />
    );

    const linkElement = document.querySelector('a');
    expect(linkElement).not.toBeNull();
    expect(linkElement?.getAttribute('target')).toBe('_blank');
    expect(linkElement?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('should render multiple markdown elements in one answer', () => {
    const items: FAQItem[] = [
      { 
        id: 'multi-test', 
        question: 'Multiple elements?', 
        answer_markdown: 'This is **bold** and here is a [link](https://test.com) and more **bold text**.' 
      },
    ];

    render(
      <FAQAccordion items={items} expandedId="multi-test" onToggle={() => {}} />
    );

    const strongElements = document.querySelectorAll('strong');
    const linkElements = document.querySelectorAll('a');
    
    expect(strongElements.length).toBe(2);
    expect(linkElements.length).toBe(1);
  });
});

// =============================================================================
// renderMarkdown Unit Tests
// =============================================================================

describe('renderMarkdown function', () => {
  it('should handle plain text without markdown', () => {
    const result = renderMarkdown('Plain text without any markdown.');
    expect(result).toBeDefined();
  });

  it('should handle empty string', () => {
    const result = renderMarkdown('');
    expect(result).toBeDefined();
  });

  it('should handle text with only bold', () => {
    const result = renderMarkdown('**bold only**');
    expect(result).toBeDefined();
  });

  it('should handle text with only link', () => {
    const result = renderMarkdown('[link](https://test.com)');
    expect(result).toBeDefined();
  });
});

// =============================================================================
// FAQAccordion Empty State
// =============================================================================

describe('FAQAccordion - Empty State', () => {
  afterEach(() => {
    cleanup();
  });

  it('should display empty message when no items', () => {
    render(
      <FAQAccordion items={[]} expandedId={null} onToggle={() => {}} />
    );

    expect(screen.getByText('No FAQs available.')).toBeDefined();
  });
});
