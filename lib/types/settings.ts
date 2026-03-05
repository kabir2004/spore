// ─── Settings Types ──────────────────────────────────────────────────────────

export type TimeFormat  = '12h' | '24h';
export type StartOfWeek = 'monday' | 'sunday';
export type Theme       = 'light' | 'dark' | 'system';
export type MemberRole  = 'owner' | 'editor' | 'viewer';

export interface UserSettings {
  id:            string;
  user_id:       string;
  full_name:     string | null;
  avatar_url:    string | null;
  timezone:      string;
  date_format:   string;
  time_format:   TimeFormat;
  start_of_week: StartOfWeek;
  language:      string;
  theme:         Theme;
  created_at:    string;
  updated_at:    string;
}

export interface WorkspaceSettings {
  workspace_id:        string;
  logo_url:            string | null;
  description:         string | null;
  website_url:         string | null;
  default_member_role: MemberRole;
  allow_public_pages:  boolean;
  created_at:          string;
  updated_at:          string;
}

export interface WorkspaceMember {
  user_id:    string;
  email:      string;
  full_name:  string | null;
  avatar_url: string | null;
  role:       MemberRole;
  joined_at:  string;
}

export interface WorkspaceInvitation {
  id:           string;
  workspace_id: string;
  invited_by:   string;
  email:        string;
  role:         MemberRole;
  token:        string;
  accepted_at:  string | null;
  expires_at:   string;
  created_at:   string;
}

export type NotificationChannel  = 'email' | 'in_app' | 'push';
export type NotificationEventType =
  | 'meeting_reminder'
  | 'meeting_invite'
  | 'page_shared'
  | 'comment_mention'
  | 'member_joined';

export interface NotificationPreference {
  id:              string;
  user_id:         string;
  workspace_id:    string | null;
  event_type:      NotificationEventType;
  channel:         NotificationChannel;
  enabled:         boolean;
  advance_minutes: number | null;
}

// ─── Action payload types ─────────────────────────────────────────────────────

export interface UpdateUserSettingsInput {
  full_name?:    string;
  avatar_url?:   string;
  timezone?:     string;
  date_format?:  string;
  time_format?:  TimeFormat;
  start_of_week?: StartOfWeek;
  language?:     string;
  theme?:        Theme;
}

export interface UpdateWorkspaceSettingsInput {
  name?:               string;
  logo_url?:           string | null;
  description?:        string | null;
  website_url?:        string | null;
  default_member_role?: MemberRole;
  allow_public_pages?: boolean;
}

export interface InviteMemberInput {
  email: string;
  role:  MemberRole;
}
