/**
 * Florist Availability Page
 *
 * Allows florists to manage their per-day delivery availability and capacity.
 * Backed by GET/PUT /florist/availability API endpoints.
 */

import { useState, useEffect } from 'react';
import { getFloristAvailability, updateFloristAvailability } from '@/lib/api';
import type { DayAvailability } from '@/lib/api';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_DAYS: DayAvailability[] = DAY_NAMES.map((_, i) => ({
  day_of_week: i,
  is_available: i < 6, // Mon-Sat available, Sun off
  max_deliveries_per_day: 10,
}));

export function AvailabilityPage() {
  const [days, setDays] = useState<DayAvailability[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFloristAvailability()
      .then((res) => setDays(res.days))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load availability'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (index: number) => {
    setDays((prev) => prev.map((d, i) => i === index ? { ...d, is_available: !d.is_available } : d));
    setSaved(false);
  };

  const handleCapChange = (index: number, value: number) => {
    if (value < 0 || value > 500) return;
    setDays((prev) => prev.map((d, i) => i === index ? { ...d, max_deliveries_per_day: value } : d));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await updateFloristAvailability(days);
      setDays(res.days);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bloom-sage" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Availability</h1>
        <p className="text-gray-500">
          Set which days you can deliver and your max capacity per day.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Day-of-week grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Schedule</h2>
        <div className="space-y-3">
          {days.map((day, index) => (
            <div
              key={day.day_of_week}
              className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${
                day.is_available ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggle(index)}
                  role="switch"
                  aria-checked={day.is_available}
                  aria-label={`Toggle ${DAY_NAMES[day.day_of_week]}`}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-bloom-sage focus:ring-offset-2 ${
                    day.is_available ? 'bg-bloom-dark' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      day.is_available ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`font-medium w-28 ${day.is_available ? 'text-gray-900' : 'text-gray-400'}`}>
                  {DAY_NAMES[day.day_of_week]}
                </span>
              </div>

              {day.is_available ? (
                <div className="flex items-center gap-2">
                  <label htmlFor={`cap-${day.day_of_week}`} className="text-sm text-gray-500">
                    Max deliveries:
                  </label>
                  <input
                    id={`cap-${day.day_of_week}`}
                    type="number"
                    min="1"
                    max="500"
                    value={day.max_deliveries_per_day}
                    onChange={(e) => handleCapChange(index, parseInt(e.target.value, 10) || 0)}
                    className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm text-center focus:border-bloom-sage focus:ring-bloom-sage"
                  />
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Days available:</span>
            <span className="ml-2 font-medium text-gray-900">
              {days.filter((d) => d.is_available).length} / 7
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total weekly capacity:</span>
            <span className="ml-2 font-medium text-gray-900">
              {days.filter((d) => d.is_available).reduce((sum, d) => sum + d.max_deliveries_per_day, 0)} deliveries
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="text-bloom-sage text-sm font-medium flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-bloom-dark hover:bg-stone-900 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
