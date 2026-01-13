/**
 * Florist Availability Page
 *
 * Allows florists to manage their delivery capacity and availability windows.
 * Changes are stored locally for now (backend persistence coming in future update).
 */

import { useState, useEffect } from 'react';

interface DeliveryWindow {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

const DEFAULT_WINDOWS: DeliveryWindow[] = [
  { day: 'Monday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Tuesday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Wednesday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Thursday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Friday', enabled: true, start: '09:00', end: '17:00' },
  { day: 'Saturday', enabled: true, start: '10:00', end: '14:00' },
  { day: 'Sunday', enabled: false, start: '10:00', end: '14:00' },
];

const STORAGE_KEY_CAPACITY = 'bloom_florist_capacity';
const STORAGE_KEY_WINDOWS = 'bloom_florist_windows';

export function AvailabilityPage() {
  const [capacity, setCapacity] = useState<number>(50);
  const [windows, setWindows] = useState<DeliveryWindow[]>(DEFAULT_WINDOWS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    const savedCapacity = localStorage.getItem(STORAGE_KEY_CAPACITY);
    const savedWindows = localStorage.getItem(STORAGE_KEY_WINDOWS);

    if (savedCapacity) {
      setCapacity(parseInt(savedCapacity, 10));
    }
    if (savedWindows) {
      try {
        setWindows(JSON.parse(savedWindows));
      } catch {
        // Use defaults if parsing fails
      }
    }
  }, []);

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0 && value <= 500) {
      setCapacity(value);
      setSaved(false);
    }
  };

  const handleWindowToggle = (index: number) => {
    const updated = [...windows];
    updated[index] = { ...updated[index], enabled: !updated[index].enabled };
    setWindows(updated);
    setSaved(false);
  };

  const handleTimeChange = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...windows];
    updated[index] = { ...updated[index], [field]: value };
    setWindows(updated);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem(STORAGE_KEY_CAPACITY, capacity.toString());
    localStorage.setItem(STORAGE_KEY_WINDOWS, JSON.stringify(windows));

    setSaving(false);
    setSaved(true);

    // Clear saved message after 3 seconds
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setCapacity(50);
    setWindows(DEFAULT_WINDOWS);
    setSaved(false);
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Availability</h1>
        <p className="text-gray-500">
          Set your delivery capacity and availability windows.
        </p>
      </div>

      {/* Weekly Capacity Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Delivery Capacity</h2>
        <p className="text-gray-500 mb-6">
          Maximum number of deliveries you can fulfill per week.
        </p>

        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <label htmlFor="capacity" className="sr-only">
              Weekly capacity
            </label>
            <div className="relative">
              <input
                type="number"
                id="capacity"
                min="1"
                max="500"
                value={capacity}
                onChange={handleCapacityChange}
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-2xl font-bold text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <span className="text-gray-500 text-sm">per week</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCapacity(Math.max(1, capacity - 10))}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            >
              -10
            </button>
            <button
              onClick={() => setCapacity(Math.min(500, capacity + 10))}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
            >
              +10
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>Quick set:</span>
          {[25, 50, 75, 100].map((val) => (
            <button
              key={val}
              onClick={() => { setCapacity(val); setSaved(false); }}
              className={`px-3 py-1 rounded-full transition-colors ${
                capacity === val
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Windows Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Windows</h2>
        <p className="text-gray-500 mb-6">
          Set the time slots when you can make deliveries each day.
        </p>

        <div className="space-y-3">
          {windows.map((window, index) => (
            <div
              key={window.day}
              className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${
                window.enabled
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleWindowToggle(index)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    window.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={window.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      window.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span
                  className={`font-medium w-24 ${
                    window.enabled ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {window.day}
                </span>
              </div>

              {window.enabled ? (
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={window.start}
                    onChange={(e) => handleTimeChange(index, 'start', e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={window.end}
                    onChange={(e) => handleTimeChange(index, 'end', e.target.value)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Closed</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Current Availability Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Weekly Capacity:</span>
            <span className="ml-2 font-medium text-gray-900">{capacity} deliveries</span>
          </div>
          <div>
            <span className="text-gray-500">Days Available:</span>
            <span className="ml-2 font-medium text-gray-900">
              {windows.filter((w) => w.enabled).length} days
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Active Hours:</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {windows
                .filter((w) => w.enabled)
                .map((w) => (
                  <span
                    key={w.day}
                    className="inline-flex px-2 py-1 text-xs bg-white border border-gray-200 rounded"
                  >
                    {w.day.slice(0, 3)}: {formatTime(w.start)} - {formatTime(w.end)}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
        >
          Reset to Defaults
        </button>

        <div className="flex items-center gap-4">
          {saved && (
            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Changes saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
