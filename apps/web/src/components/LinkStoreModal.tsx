/**
 * LinkStoreModal component for Shopify store connection.
 * 
 * Displays instructions and placeholder for Shopify OAuth flow.
 * This is a placeholder implementation for future Shopify integration.
 */

import { useEffect, useCallback } from 'react';

interface LinkStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * Modal for linking a Shopify store to Bloom.
 * 
 * - Displays Shopify connection instructions
 * - Includes placeholder button for OAuth flow
 * - Handles close on backdrop click and Escape key
 */
export function LinkStoreModal({ isOpen, onClose, onComplete }: LinkStoreModalProps) {
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

  const handleConnect = () => {
    // Placeholder: In future, this will initiate Shopify OAuth
    // For now, mark as complete for demo purposes
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="link-store-modal">
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
            <h2 className="text-lg font-semibold text-gray-900">Link Your Shopify Store</h2>
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

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Shopify store to sync your products with Bloom. Your product catalog 
              will be automatically imported and kept in sync.
            </p>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-indigo-900 mb-2">What happens next:</h3>
              <ul className="text-sm text-indigo-700 space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  You'll be redirected to Shopify to authorize Bloom
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  Your products will be imported automatically
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500">•</span>
                  Changes in Shopify will sync to Bloom
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Shopify integration is coming soon. Click below to simulate 
                connection for demo purposes.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConnect}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700"
              data-testid="connect-shopify-button"
            >
              Connect Shopify Store
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
