'use client';

import React, { useState, useRef } from 'react';
import { Camera } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import {
  SettingsSection, SettingsField, SettingsInput,
  SettingsSelect, SettingsSaveButton,
} from './SettingsShell';
import type { UserSettings, UpdateUserSettingsInput } from '@/lib/types/settings';

const TIMEZONES = [
  { value: 'UTC',                     label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York',        label: 'Eastern Time (ET)' },
  { value: 'America/Chicago',         label: 'Central Time (CT)' },
  { value: 'America/Denver',          label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles',     label: 'Pacific Time (PT)' },
  { value: 'Europe/London',           label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',            label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin',           label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Dubai',              label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata',            label: 'Mumbai / Delhi (IST)' },
  { value: 'Asia/Singapore',          label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo',              label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney',        label: 'Sydney (AEST/AEDT)' },
];

const DATE_FORMATS = [
  { value: 'MMM D, YYYY',  label: 'Mar 5, 2026' },
  { value: 'MM/DD/YYYY',   label: '03/05/2026' },
  { value: 'DD/MM/YYYY',   label: '05/03/2026' },
  { value: 'YYYY-MM-DD',   label: '2026-03-05' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
];

interface Props {
  settings: UserSettings | null;
  email:    string;
  onSave:   (input: UpdateUserSettingsInput) => Promise<{ error: string | null }>;
}

export function ProfileSettings({ settings, email, onSave }: Props) {
  const [fullName,   setFullName]   = useState(settings?.full_name   ?? '');
  const [timezone,   setTimezone]   = useState(settings?.timezone    ?? 'UTC');
  const [dateFormat, setDateFormat] = useState(settings?.date_format ?? 'MMM D, YYYY');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(settings?.time_format ?? '12h');
  const [startOfWeek, setStartOfWeek] = useState<'monday' | 'sunday'>(settings?.start_of_week ?? 'monday');
  const [language,   setLanguage]   = useState(settings?.language    ?? 'en');
  const [loading,    setLoading]    = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const result = await onSave({
      full_name: fullName,
      timezone,
      date_format: dateFormat,
      time_format: timeFormat,
      start_of_week: startOfWeek,
      language,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const displayName = fullName || email;
  const initials    = displayName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  return (
    <div>
      <SettingsSection
        title="Profile"
        description="Your name and preferences visible to other workspace members."
      >
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Avatar name={displayName} size={64} className="text-[22px]" />
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
              <Camera size={18} className="text-white" />
            </div>
          </div>
          <div>
            <p className="text-[14px] font-medium text-text-primary">{displayName}</p>
            <p className="text-[13px] text-text-muted">{email}</p>
          </div>
        </div>

        <SettingsField label="Full name">
          <SettingsInput
            value={fullName}
            onChange={setFullName}
            placeholder="Your full name"
          />
        </SettingsField>

        <SettingsField label="Email address" description="Managed through your account settings.">
          <SettingsInput value={email} onChange={() => {}} disabled />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Preferences"
        description="Localization and display preferences."
      >
        <div className="grid grid-cols-2 gap-4">
          <SettingsField label="Language">
            <SettingsSelect
              value={language}
              onChange={setLanguage}
              options={LANGUAGES}
            />
          </SettingsField>

          <SettingsField label="Timezone">
            <SettingsSelect
              value={timezone}
              onChange={setTimezone}
              options={TIMEZONES}
            />
          </SettingsField>

          <SettingsField label="Date format">
            <SettingsSelect
              value={dateFormat}
              onChange={setDateFormat}
              options={DATE_FORMATS}
            />
          </SettingsField>

          <SettingsField label="Time format">
            <SettingsSelect
              value={timeFormat}
              onChange={(v) => setTimeFormat(v as '12h' | '24h')}
              options={[
                { value: '12h', label: '12-hour (1:00 PM)' },
                { value: '24h', label: '24-hour (13:00)' },
              ]}
            />
          </SettingsField>

          <SettingsField label="Week starts on">
            <SettingsSelect
              value={startOfWeek}
              onChange={(v) => setStartOfWeek(v as 'monday' | 'sunday')}
              options={[
                { value: 'monday', label: 'Monday' },
                { value: 'sunday', label: 'Sunday' },
              ]}
            />
          </SettingsField>
        </div>
      </SettingsSection>

      {error && (
        <p className="text-[13px] text-[#E03E3E] mb-4">{error}</p>
      )}

      <SettingsSaveButton
        loading={loading}
        saved={saved}
        onClick={handleSave}
      />
    </div>
  );
}
