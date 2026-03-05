'server only';

import { createClient } from '@/lib/supabase/server';
import type {
  CalendarEvent,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  GoogleCalendarEvent,
  MicrosoftCalendarEvent,
} from '@/lib/types/calendarEvent';
import { getIntegration, refreshGoogleToken, refreshMicrosoftToken } from './integrations';

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getCalendarEvents(
  workspaceId: string,
  from?: string,
  to?: string
): Promise<CalendarEvent[]> {
  const supabase = await createClient();

  let query = (supabase.from('calendar_events') as any)
    .select(`*, attendees:calendar_attendees(*)`)
    .eq('workspace_id', workspaceId)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true });

  if (from) query = query.gte('start_time', from);
  if (to)   query = query.lte('start_time', to);

  const { data } = await query;
  return (data ?? []) as unknown as CalendarEvent[];
}

export async function createCalendarEvent(
  workspaceId: string,
  input: CreateCalendarEventInput
): Promise<{ data: CalendarEvent | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { attendees, ...eventData } = input;

  const { data: event, error } = await (supabase.from('calendar_events') as any)
    .insert({
      workspace_id: workspaceId,
      created_by:   user.id,
      source:       'spore',
      ...eventData,
    })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  if (attendees?.length) {
    await (supabase.from('calendar_attendees') as any)
      .insert(
        attendees.map((a) => ({
          event_id: event.id,
          email:    a.email,
          name:     a.name ?? null,
        }))
      );
  }

  return { data: event as CalendarEvent, error: null };
}

export async function updateCalendarEvent(
  eventId: string,
  input: UpdateCalendarEventInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from('calendar_events') as any)
    .update(input)
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

export async function deleteCalendarEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from('calendar_events') as any)
    .update({ status: 'cancelled' })
    .eq('id', eventId);

  return { error: error?.message ?? null };
}

// ─── Google Calendar Sync ─────────────────────────────────────────────────────

export async function syncGoogleCalendar(
  workspaceId: string
): Promise<{ synced: number; error: string | null }> {
  let integration = await getIntegration('google_calendar');
  if (!integration?.is_active) return { synced: 0, error: 'Google Calendar not connected' };

  // Refresh token if expired
  const now = Date.now();
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  let accessToken = integration.access_token!;
  if (now > expiresAt - 60_000) {
    const { access_token, error } = await refreshGoogleToken(integration);
    if (error) return { synced: 0, error };
    accessToken = access_token;
  }

  // Fetch events from Google Calendar (next 30 days)
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy:       'startTime',
      maxResults:    '250',
    }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    return { synced: 0, error: err.error?.message ?? 'Google Calendar fetch failed' };
  }

  const json = await res.json();
  const items: GoogleCalendarEvent[] = json.items ?? [];

  const supabase = await createClient();
  let synced = 0;

  for (const item of items) {
    const allDay    = !!item.start.date && !item.start.dateTime;
    const startTime = item.start.dateTime ?? `${item.start.date}T00:00:00Z`;
    const endTime   = item.end.dateTime   ?? `${item.end.date}T23:59:59Z`;

    const eventPayload = {
      workspace_id:    workspaceId,
      title:           item.summary ?? '(No title)',
      description:     item.description ?? null,
      start_time:      startTime,
      end_time:        endTime,
      all_day:         allDay,
      timezone:        item.start.timeZone ?? 'UTC',
      location:        item.location ?? null,
      join_url:        item.hangoutLink ?? null,
      status:          (item.status === 'cancelled' ? 'cancelled' : 'confirmed') as 'confirmed' | 'cancelled',
      source:          'google' as const,
      external_id:     item.id,
      integration_id:  integration.id,
      etag:            item.etag ?? null,
    };

    const { error } = await (supabase.from('calendar_events') as any)
      .upsert(eventPayload, { onConflict: 'workspace_id,source,external_id' });

    if (!error) synced++;
  }

  return { synced, error: null };
}

// ─── Microsoft Calendar Sync ──────────────────────────────────────────────────

export async function syncMicrosoftCalendar(
  workspaceId: string
): Promise<{ synced: number; error: string | null }> {
  let integration = await getIntegration('microsoft_calendar');
  if (!integration?.is_active) return { synced: 0, error: 'Microsoft Calendar not connected' };

  const now       = Date.now();
  const expiresAt = integration.token_expires_at
    ? new Date(integration.token_expires_at).getTime()
    : 0;

  let accessToken = integration.access_token!;
  if (now > expiresAt - 60_000) {
    const { access_token, error } = await refreshMicrosoftToken(integration);
    if (error) return { synced: 0, error };
    accessToken = access_token;
  }

  const startDateTime = new Date().toISOString();
  const endDateTime   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?` +
    new URLSearchParams({ startDateTime, endDateTime, $top: '250' }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    return { synced: 0, error: err.error?.message ?? 'Microsoft Calendar fetch failed' };
  }

  const json = await res.json();
  const items: MicrosoftCalendarEvent[] = json.value ?? [];

  const supabase = await createClient();
  let synced = 0;

  for (const item of items) {
    const eventPayload = {
      workspace_id:   workspaceId,
      title:          item.subject ?? '(No title)',
      description:    item.bodyPreview ?? null,
      start_time:     item.start.dateTime,
      end_time:       item.end.dateTime,
      all_day:        item.isAllDay ?? false,
      timezone:       item.start.timeZone ?? 'UTC',
      location:       item.location?.displayName ?? null,
      join_url:       item.onlineMeeting?.joinUrl ?? null,
      status:         (item.isCancelled ? 'cancelled' : 'confirmed') as 'confirmed' | 'cancelled',
      source:         'microsoft' as const,
      external_id:    item.id,
      integration_id: integration.id,
      etag:           item.changeKey ?? null,
    };

    const { error } = await (supabase.from('calendar_events') as any)
      .upsert(eventPayload, { onConflict: 'workspace_id,source,external_id' });

    if (!error) synced++;
  }

  return { synced, error: null };
}

// ─── Populate from existing meetings (spore-native) ──────────────────────────

export async function syncMeetingsToCalendar(
  workspaceId: string
): Promise<{ synced: number; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { synced: 0, error: 'Not authenticated' };

  const { data: meetings } = await (supabase.from('meetings') as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .neq('status', 'cancelled');

  if (!meetings?.length) return { synced: 0, error: null };

  let synced = 0;
  for (const meeting of meetings) {
    const { error } = await (supabase.from('calendar_events') as any)
      .upsert(
        {
          workspace_id:   workspaceId,
          created_by:     meeting.created_by,
          title:          meeting.title,
          description:    meeting.description ?? null,
          start_time:     meeting.start_time,
          end_time:       meeting.end_time,
          location:       meeting.location ?? null,
          join_url:       meeting.join_url ?? null,
          status:         'confirmed',
          source:         'spore',
          external_id:    meeting.id,
          meeting_id:     meeting.id,
          notes_block_id: meeting.notes_block_id ?? null,
        },
        { onConflict: 'workspace_id,source,external_id' }
      );

    if (!error) synced++;
  }

  return { synced, error: null };
}
