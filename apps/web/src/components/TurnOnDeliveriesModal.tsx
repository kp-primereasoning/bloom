/**
 * TurnOnDeliveriesModal component for enabling deliveries.
 * 
 * Displays toggle/confirmation to enable deliveries.
 * Shows prerequisite message if products are not linked.
 */

import { useEffect, useCallback, useState } from 'react';

interface TurnOnDeliveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  productsLinked: boolean;
}

/**
 * Modal for enabling deliveries on Bloom.
 * 
 * - Shows prerequisite message if products not linked
 * - Displays confirmation toggle when products are linked
 * - Handles close on backdrop click and Escape key
 */
export function TurnOnDeliveriesModal({ isOpen, onClose, onComplete, productsLinked }: TurnOnDeliveriesModalProps) {
  const [confirmed, setConfirmed] = useState(false);

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

  // Reset confirmation when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEnable = () => {
    if (confirmed) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="turn-on-deliveries-modal">
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
            <h2 className="text-lg font-semibold text-gray-900">Turn on Deliveries</h2>
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

          {!productsLinked ? (
            // Prerequisite message
            <div className="space-y-4" data-testid="prerequisite-message">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Products Required</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      You need to link your products first before you can enable deliveries.
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
            // Enable deliveries interface
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Once you turn on deliveries, you'll start receiving delivery requests from Bloom 
                for your assigned properties.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-900 mb-2">You're almost ready!</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Store connected
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Products linked
                  </li>
                </ul>
              </div>

              {/* Confirmation toggle */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  data-testid="confirm-checkbox"
                />
                <span className="text-sm text-gray-700">
                  I understand that enabling deliveries means I'll receive delivery requests 
                  and am ready to fulfill orders.
                </span>
              </label>

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
                  onClick={handleEnable}
                  disabled={!confirmed}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="enable-deliveries-button"
                >
                  Enable Deliveries
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
