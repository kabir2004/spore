// ─── Calendar Event Types ────────────────────────────────────────────────────

export type EventStatus    = 'confirmed' | 'tentative' | 'cancelled';
export type EventSource    = 'spore' | 'google' | 'microsoft' | 'cal_com';
export type AttendeeResponse = 'needsAction' | 'accepted' | 'declined' | 'tentative';
export type CalView        = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id:              string;
  workspace_id:    string;
  created_by:      string | null;
  title:           string;
  description:     string | null;
  start_time:      string;       // ISO 8601
  end_time:        string;
  all_day:         boolean;
  timezone:        string;
  location:        string | null;
  join_url:        string | null;
  status:          EventStatus;
  source:          EventSource;
  external_id:     string | null;
  calendar_id:     string | null;
  integration_id:  string | null;
  meeting_id:      string | null;
  notes_block_id:  string | null;
  recurrence_rule: string | null;
  recurrence_id:   string | null;
  color:           string | null;
  metadata:        Record<string, unknown>;
  created_at:      string;
  updated_at:      string;
  attendees?:      CalendarAttendee[];
}

export interface CalendarAttendee {
  id:              string;
  event_id:        string;
  user_id:         string | null;
  email:           string;
  name:            string | null;
  response_status: AttendeeResponse;
  is_organizer:    boolean;
  comment:         string | null;
}

export interface CreateCalendarEventInput {
  title:           string;
  description?:    string;
  start_time:      string;
  end_time:        string;
  all_day?:        boolean;
  timezone?:       string;
  location?:       string;
  join_url?:       string;
  meeting_id?:     string;
  notes_block_id?: string;
  color?:          string;
  attendees?:      { email: string; name?: string }[];
}

export interface UpdateCalendarEventInput extends Partial<CreateCalendarEventInput> {
  status?: EventStatus;
}

// ─── Google Calendar API shapes ───────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id:          string;
  summary:     string;
  description?: string;
  start:        { dateTime?: string; date?: string; timeZone?: string };
  end:          { dateTime?: string; date?: string; timeZone?: string };
  location?:    string;
  htmlLink?:    string;
  hangoutLink?: string;
  status?:      string;
  etag?:        string;
  colorId?:     string;
  attendees?:   Array<{
    email:          string;
    displayName?:   string;
    responseStatus: string;
    organizer?:     boolean;
  }>;
  recurrence?:  string[];
  recurringEventId?: string;
}

export interface GoogleCalendarList {
  items: Array<{
    id:      string;
    summary: string;
    primary?: boolean;
    selected?: boolean;
    accessRole: string;
  }>;
}

// ─── Microsoft Graph shapes ───────────────────────────────────────────────────

export interface MicrosoftCalendarEvent {
  id:            string;
  subject:       string;
  bodyPreview?:  string;
  start:         { dateTime: string; timeZone: string };
  end:           { dateTime: string; timeZone: string };
  location?:     { displayName: string };
  onlineMeeting?: { joinUrl: string };
  isCancelled?:  boolean;
  isAllDay?:     boolean;
  attendees?:    Array<{
    emailAddress: { address: string; name?: string };
    status:       { response: string };
    type:         string;
  }>;
  changeKey?:    string;
}
