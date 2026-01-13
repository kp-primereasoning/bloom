/**
 * Property-based tests for onboarding modal components.
 * 
 * Feature: florist-onboarding-steps
 * Property 5: Prerequisite Steps Block Dependent Steps
 * Validates: Requirements 5.2, 6.2
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { LinkProductsModal } from './LinkProductsModal';
import { TurnOnDeliveriesModal } from './TurnOnDeliveriesModal';

// Clean up after each test
afterEach(() => {
  cleanup();
});

describe('Onboarding Modals Prerequisite Validation', () => {
  /**
   * Property 5: Prerequisite Steps Block Dependent Steps
   * For any step with prerequisites (link-products requires link-store, 
   * turn-on-deliveries requires link-products), if the prerequisite is incomplete, 
   * the modal SHALL display a prerequisite message instead of the completion interface.
   * 
   * **Validates: Requirements 5.2, 6.2**
   */
  describe('LinkProductsModal', () => {
    it('should show prerequisite message when store is not linked', () => {
      fc.assert(
        fc.property(fc.boolean(), (storeLinked) => {
          cleanup();
          
          render(
            <LinkProductsModal
              isOpen={true}
              onClose={() => {}}
              onComplete={() => {}}
              storeLinked={storeLinked}
            />
          );
          
          if (!storeLinked) {
            // Should show prerequisite message
            expect(screen.getByTestId('prerequisite-message')).toBeInTheDocument();
            expect(screen.queryByTestId('link-products-button')).not.toBeInTheDocument();
          } else {
            // Should show completion interface
            expect(screen.queryByTestId('prerequisite-message')).not.toBeInTheDocument();
            expect(screen.getByTestId('link-products-button')).toBeInTheDocument();
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('TurnOnDeliveriesModal', () => {
    it('should show prerequisite message when products are not linked', () => {
      fc.assert(
        fc.property(fc.boolean(), (productsLinked) => {
          cleanup();
          
          render(
            <TurnOnDeliveriesModal
              isOpen={true}
              onClose={() => {}}
              onComplete={() => {}}
              productsLinked={productsLinked}
            />
          );
          
          if (!productsLinked) {
            // Should show prerequisite message
            expect(screen.getByTestId('prerequisite-message')).toBeInTheDocument();
            expect(screen.queryByTestId('enable-deliveries-button')).not.toBeInTheDocument();
          } else {
            // Should show completion interface
            expect(screen.queryByTestId('prerequisite-message')).not.toBeInTheDocument();
            expect(screen.getByTestId('enable-deliveries-button')).toBeInTheDocument();
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  // Unit tests for modal behavior
  describe('LinkProductsModal unit tests', () => {
    it('should not render when isOpen is false', () => {
      render(
        <LinkProductsModal
          isOpen={false}
          onClose={() => {}}
          onComplete={() => {}}
          storeLinked={true}
        />
      );
      
      expect(screen.queryByTestId('link-products-modal')).not.toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      
      render(
        <LinkProductsModal
          isOpen={true}
          onClose={handleClose}
          onComplete={() => {}}
          storeLinked={true}
        />
      );
      
      screen.getByTestId('modal-backdrop').click();
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when link products button is clicked', () => {
      const handleComplete = vi.fn();
      
      render(
        <LinkProductsModal
          isOpen={true}
          onClose={() => {}}
          onComplete={handleComplete}
          storeLinked={true}
        />
      );
      
      screen.getByTestId('link-products-button').click();
      expect(handleComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('TurnOnDeliveriesModal unit tests', () => {
    it('should not render when isOpen is false', () => {
      render(
        <TurnOnDeliveriesModal
          isOpen={false}
          onClose={() => {}}
          onComplete={() => {}}
          productsLinked={true}
        />
      );
      
      expect(screen.queryByTestId('turn-on-deliveries-modal')).not.toBeInTheDocument();
    });

    it('should call onClose when backdrop is clicked', () => {
      const handleClose = vi.fn();
      
      render(
        <TurnOnDeliveriesModal
          isOpen={true}
          onClose={handleClose}
          onComplete={() => {}}
          productsLinked={true}
        />
      );
      
      screen.getByTestId('modal-backdrop').click();
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('should require confirmation checkbox before enabling', () => {
      const handleComplete = vi.fn();
      
      render(
        <TurnOnDeliveriesModal
          isOpen={true}
          onClose={() => {}}
          onComplete={handleComplete}
          productsLinked={true}
        />
      );
      
      const enableButton = screen.getByTestId('enable-deliveries-button');
      expect(enableButton).toBeDisabled();
      
      // Click without checking checkbox
      enableButton.click();
      expect(handleComplete).not.toHaveBeenCalled();
    });

    it('should call onComplete when checkbox is checked and button clicked', () => {
      const handleComplete = vi.fn();
      
      render(
        <TurnOnDeliveriesModal
          isOpen={true}
          onClose={() => {}}
          onComplete={handleComplete}
          productsLinked={true}
        />
      );
      
      // Check the confirmation checkbox
      const checkbox = screen.getByTestId('confirm-checkbox');
      checkbox.click();
      
      // Now button should be enabled
      const enableButton = screen.getByTestId('enable-deliveries-button');
      expect(enableButton).not.toBeDisabled();
      
      enableButton.click();
      expect(handleComplete).toHaveBeenCalledTimes(1);
    });
  });
});
