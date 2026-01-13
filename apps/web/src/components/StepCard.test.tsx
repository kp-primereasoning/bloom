/**
 * Property-based tests for StepCard component.
 * 
 * Feature: florist-onboarding-steps
 * Property 1: Step Card Indicator Matches Completion State
 * Property 2: Step Card Contains Required Information
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { StepCard, type OnboardingStep } from './StepCard';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Arbitrary for generating valid step IDs
const stepIdArb = fc.constantFrom('link-store', 'link-products', 'turn-on-deliveries') as fc.Arbitrary<OnboardingStep['id']>;

// Arbitrary for generating valid OnboardingStep objects
const onboardingStepArb = fc.record({
  id: stepIdArb,
  number: fc.integer({ min: 1, max: 10 }),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  isComplete: fc.boolean(),
});

describe('StepCard', () => {
  /**
   * Property 1: Step Card Indicator Matches Completion State
   * For any step and any completion state (true or false), the StepCard component
   * SHALL render a checkmark indicator when complete and an empty circle indicator when incomplete.
   * 
   * **Validates: Requirements 2.1, 2.2**
   */
  it('should render correct indicator based on completion state', () => {
    fc.assert(
      fc.property(onboardingStepArb, (step) => {
        cleanup();
        
        render(<StepCard step={step} onClick={() => {}} />);
        
        if (step.isComplete) {
          // Should show checkmark indicator
          expect(screen.getByTestId('step-complete-indicator')).toBeInTheDocument();
          expect(screen.queryByTestId('step-incomplete-indicator')).not.toBeInTheDocument();
        } else {
          // Should show empty circle indicator
          expect(screen.getByTestId('step-incomplete-indicator')).toBeInTheDocument();
          expect(screen.queryByTestId('step-complete-indicator')).not.toBeInTheDocument();
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: Step Card Contains Required Information
   * For any step configuration, the rendered StepCard SHALL contain
   * the step number, title, and description text.
   * 
   * **Validates: Requirements 2.3**
   */
  it('should display step number, title, and description', () => {
    fc.assert(
      fc.property(onboardingStepArb, (step) => {
        cleanup();
        
        render(<StepCard step={step} onClick={() => {}} />);
        
        // Title should be present
        const titleElement = screen.getByTestId('step-title');
        expect(titleElement.textContent).toBe(step.title);
        
        // Description should be present
        const descElement = screen.getByTestId('step-description');
        expect(descElement.textContent).toBe(step.description);
        
        // Step number should be visible when incomplete (in the circle)
        if (!step.isComplete) {
          const indicator = screen.getByTestId('step-incomplete-indicator');
          expect(indicator.textContent).toBe(step.number.toString());
        }
        
        return true;
      }),
      { numRuns: 100 }
    );
  });

  // Unit test: onClick is called when card is clicked
  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    const step: OnboardingStep = {
      id: 'link-store',
      number: 1,
      title: 'Link a Store',
      description: 'Connect your Shopify store',
      isComplete: false,
    };
    
    render(<StepCard step={step} onClick={handleClick} />);
    
    const card = screen.getByTestId('step-card-link-store');
    card.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Unit test: disabled card does not trigger onClick
  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    const step: OnboardingStep = {
      id: 'link-store',
      number: 1,
      title: 'Link a Store',
      description: 'Connect your Shopify store',
      isComplete: false,
    };
    
    render(<StepCard step={step} onClick={handleClick} disabled={true} />);
    
    const card = screen.getByTestId('step-card-link-store');
    card.click();
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  // Unit test: complete state has green styling
  it('should apply green styling when complete', () => {
    const step: OnboardingStep = {
      id: 'link-store',
      number: 1,
      title: 'Link a Store',
      description: 'Connect your Shopify store',
      isComplete: true,
    };
    
    render(<StepCard step={step} onClick={() => {}} />);
    
    const card = screen.getByTestId('step-card-link-store');
    expect(card).toHaveClass('bg-green-50');
  });

  // Unit test: incomplete state has white styling
  it('should apply white styling when incomplete', () => {
    const step: OnboardingStep = {
      id: 'link-store',
      number: 1,
      title: 'Link a Store',
      description: 'Connect your Shopify store',
      isComplete: false,
    };
    
    render(<StepCard step={step} onClick={() => {}} />);
    
    const card = screen.getByTestId('step-card-link-store');
    expect(card).toHaveClass('bg-white');
  });
});
