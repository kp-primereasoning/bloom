/**
 * Property Manager Settings Page
 *
 * Displays PM profile information (read-only) and notification preferences
 * with toggle switches. Uses optimistic UI: toggles update immediately,
 * revert on API error with an error banner.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPMSettings,
  updatePMSettings,
  type PMSettingsResponse,
  type NotificationPreferences,
} from '@/lib/api';

// =============================================================================
// Toggle switch component
// =============================================================================

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}

function ToggleSwitch({ id, checked, onChange, label, description, disabled }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
      <div className="pr-4">
        <label htmlFor={id} className="font-medium text-gray-900 cursor-pointer">
          {label}
        </label>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? 'enabled' : 'disabled'}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export function SettingsPage() {
  const [settings, setSettings] = useState<PMSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPMSettings();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleToggle = useCallback(
    async (key: keyof NotificationPreferences, newValue: boolean) => {
      if (!settings) return;

      const previousNotifications = { ...settings.notifications };
      const updatedNotifications: NotificationPreferences = {
        ...settings.notifications,
        [key]: newValue,
      };

      // Optimistic update
      setSettings({ ...settings, notifications: updatedNotifications });
      setSaveError(null);

      try {
        const response = await updatePMSettings({ notifications: updatedNotifications });
        setSettings(response);
      } catch (err) {
        // Revert on failure
        setSettings({ ...settings, notifications: previousNotifications });
        setSaveError(
          err instanceof Error ? err.message : 'Failed to save notification preferences'
        );
      }
    },
    [settings]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
              <p className="text-gray-500 text-sm">Loading settings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!settings) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500">No settings data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-500">
          Manage your profile information and notification preferences.
        </p>
      </div>

      {/* Save Error Banner */}
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-700">{saveError}</p>
          </div>
        </div>
      )}

      {/* Profile Section (read-only) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
        <dl className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-sm font-medium text-gray-500 sm:w-40 flex-shrink-0">Email</dt>
            <dd className="text-sm text-gray-900 mt-1 sm:mt-0">{settings.email}</dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-sm font-medium text-gray-500 sm:w-40 flex-shrink-0">Property</dt>
            <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
              {settings.property_name || <span className="text-gray-400">Not assigned</span>}
            </dd>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-4">
            <dt className="text-sm font-medium text-gray-500 sm:w-40 flex-shrink-0">Address</dt>
            <dd className="text-sm text-gray-900 mt-1 sm:mt-0">
              {settings.property_address || <span className="text-gray-400">Not available</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mb-6">
          Choose which notifications you'd like to receive.
        </p>

        <div>
          <ToggleSwitch
            id="toggle-delivery-reminders"
            checked={settings.notifications.delivery_reminders}
            onChange={(val) => handleToggle('delivery_reminders', val)}
            label="Delivery Reminders"
            description="Get notified about upcoming deliveries for your property"
          />
          <ToggleSwitch
            id="toggle-participation-updates"
            checked={settings.notifications.participation_updates}
            onChange={(val) => handleToggle('participation_updates', val)}
            label="Participation Updates"
            description="Receive updates when residents join or leave the program"
          />
          <ToggleSwitch
            id="toggle-rewards-milestones"
            checked={settings.notifications.rewards_milestones}
            onChange={(val) => handleToggle('rewards_milestones', val)}
            label="Rewards Milestones"
            description="Get notified when your property reaches a new reward tier"
          />
        </div>
      </div>
    </div>
  );
}
