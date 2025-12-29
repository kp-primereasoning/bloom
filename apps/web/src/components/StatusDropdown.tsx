/**
 * Inline dropdown for updating entity status.
 */

import { useState, type ChangeEvent } from 'react';

interface StatusDropdownProps {
  currentStatus: string;
  options: string[];
  onStatusChange: (newStatus: string) => Promise<void>;
  disabled?: boolean;
}

export function StatusDropdown({ 
  currentStatus, 
  options, 
  onStatusChange, 
  disabled = false 
}: StatusDropdownProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    if (newStatus === currentStatus) return;

    setUpdating(true);
    setError(null);
    try {
      await onStatusChange(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="inline-flex flex-col">
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={disabled || updating}
        className={`
          px-2 py-1 text-sm border rounded-md
          focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
          ${updating ? 'opacity-50 cursor-wait' : ''}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer'}
        `}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && (
        <span className="text-xs text-red-600 mt-1">{error}</span>
      )}
    </div>
  );
}
