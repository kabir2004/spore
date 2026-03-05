'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import type { NotificationPreference, NotificationEventType, NotificationChannel } from '@/lib/types/settings';

interface Props {
  preferences: NotificationPreference[];
  onUpdate: (
    eventType: NotificationEventType,
    channel:   NotificationChannel,
    enabled:   boolean,
    advanceMinutes?: number
  ) => Promise<{ error: string | null }>;
}

const EVENT_TYPES: { id: NotificationEventType; label: string; description: string }[] = [
  { id: 'meeting_reminder', label: 'Meeting reminders',  description: 'Get notified before meetings start' },
  { id: 'meeting_invite',   label: 'Meeting invitations', description: 'Someone invites you to a meeting' },
  { id: 'page_shared',      label: 'Page shared',         description: 'A page is shared with you' },
  { id: 'comment_mention',  label: 'Mentions',            description: 'Someone mentions you in a comment' },
  { id: 'member_joined',    label: 'New members',         description: 'A new member joins the workspace' },
];

const CHANNELS: { id: NotificationChannel; label: string }[] = [
  { id: 'in_app', label: 'In-app' },
  { id: 'email',  label: 'Email' },
];

const REMINDER_OPTIONS = [
  { value: 5,    label: '5 minutes before' },
  { value: 10,   label: '10 minutes before' },
  { value: 15,   label: '15 minutes before' },
  { value: 30,   label: '30 minutes before' },
  { value: 60,   label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-[36px] h-[20px] rounded-full transition-colors cursor-pointer shrink-0',
        enabled ? 'bg-accent-blue' : 'bg-bg-hover border border-border-default'
      )}
    >
      <div
        className={cn(
          'absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform',
          enabled ? 'translate-x-[17px]' : 'translate-x-[2px]'
        )}
      />
    </div>
  );
}

export function NotificationsSettings({ preferences, onUpdate }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [reminder, setReminder] = useState<number>(15);

  const getPreference = (eventType: string, channel: string) =>
    preferences.find((p) => p.event_type === eventType && p.channel === channel);

  const isEnabled = (eventType: string, channel: string) => {
    const pref = getPreference(eventType, channel);
    return pref ? pref.enabled : true; // default enabled
  };

  const handleToggle = async (
    eventType: NotificationEventType,
    channel:   NotificationChannel,
    enabled:   boolean
  ) => {
    const key = `${eventType}:${channel}`;
    setLoading(key);
    await onUpdate(eventType, channel, enabled);
    setLoading(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-[16px] font-semibold text-text-primary mb-1">Notifications</h2>
        <p className="text-[13.5px] text-text-secondary">
          Choose which notifications you receive and where.
        </p>
      </div>

      {/* Channel headers */}
      <div className="flex items-center mb-2 px-4">
        <div className="flex-1" />
        {CHANNELS.map((ch) => (
          <div key={ch.id} className="w-[80px] text-center">
            <span className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">
              {ch.label}
            </span>
          </div>
        ))}
      </div>

      {/* Notification rows */}
      <div className="border border-border-default rounded-[10px] overflow-hidden">
        {EVENT_TYPES.map((event, i) => (
          <div
            key={event.id}
            className={cn(
              'flex items-center gap-3 px-4 py-4',
              i < EVENT_TYPES.length - 1 && 'border-b border-border-light'
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium text-text-primary">{event.label}</p>
              <p className="text-[12.5px] text-text-muted mt-0.5">{event.description}</p>
              {event.id === 'meeting_reminder' && (
                <div className="mt-2">
                  <select
                    value={reminder}
                    onChange={(e) => setReminder(Number(e.target.value))}
                    className="text-[12px] bg-bg-secondary border border-border-light rounded-[5px] px-2 py-1 outline-none text-text-secondary cursor-pointer"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {CHANNELS.map((ch) => {
              const enabled = isEnabled(event.id, ch.id);
              const key     = `${event.id}:${ch.id}`;
              return (
                <div key={ch.id} className="w-[80px] flex justify-center">
                  <div className={loading === key ? 'opacity-50' : ''}>
                    <Toggle
                      enabled={enabled}
                      onChange={(v) => handleToggle(event.id, ch.id, v)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-[12.5px] text-text-muted mt-4">
        Email notifications are sent to your account email. Push notifications require browser permission.
      </p>
    </div>
  );
}
