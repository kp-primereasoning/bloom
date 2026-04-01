/**
 * LinkProductsModal component for product selection.
 * 
 * Displays product selection interface placeholder.
 * Shows prerequisite message if store is not linked.
 */

import { useEffect, useCallback } from 'react';

interface LinkProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  storeLinked: boolean;
}

/**
 * Modal for selecting products to offer on Bloom.
 * 
 * - Shows prerequisite message if store not linked
 * - Displays product selection placeholder when store is linked
 * - Handles close on backdrop click and Escape key
 */
export function LinkProductsModal({ isOpen, onClose, onComplete, storeLinked }: LinkProductsModalProps) {
  // Handle Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleLinkProducts = () => {
    // Placeholder: In future, this will save product selections
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="link-products-modal">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          data-testid="modal-backdrop"
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Link Products</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!storeLinked ? (
            // Prerequisite message
            <div className="space-y-4" data-testid="prerequisite-message">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Store Required</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      You need to link your Shopify store first before you can select products.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            // Product selection interface
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select which products from your Shopify store you want to offer on Bloom.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500 text-center">
                  Product selection interface coming soon.
                </p>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Your Shopify products will appear here for selection.
                </p>
              </div>

              <div className="bg-bloom-sage/10 border border-bloom-sage/30 rounded-lg p-3">
                <p className="text-sm text-indigo-800">
                  <strong>Note:</strong> Click below to simulate product linking for demo purposes.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLinkProducts}
                  className="px-4 py-2 text-sm font-medium text-white bg-bloom-dark border border-transparent rounded-md hover:bg-stone-900"
                  data-testid="link-products-button"
                >
                  Link Products
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
