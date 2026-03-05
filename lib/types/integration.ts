// ─── Integration Types ───────────────────────────────────────────────────────

export type IntegrationProvider =
  | 'google_calendar'
  | 'google_gmail'
  | 'microsoft_calendar'
  | 'microsoft_outlook'
  | 'cal_com'
  | 'zoom'
  | 'slack'
  | 'anthropic'
  | 'openai'
  | 'google_gemini'
  | 'groq';

export interface Integration {
  id:               string;
  user_id:          string;
  workspace_id:     string | null;
  provider:         IntegrationProvider;
  access_token:     string | null;
  refresh_token:    string | null;
  token_expires_at: string | null;
  provider_user_id: string | null;
  provider_email:   string | null;
  scopes:           string[];
  metadata:         Record<string, unknown>;
  is_active:        boolean;
  created_at:       string;
  updated_at:       string;
}

// Safe public version (never expose tokens to client components)
export interface IntegrationPublic {
  id:             string;
  provider:       IntegrationProvider;
  provider_email: string | null;
  is_active:      boolean;
  scopes:         string[];
  metadata:       Record<string, unknown>;
  created_at:     string;
  updated_at:     string;
}

export interface CalComIntegrationMeta {
  api_key:       string;
  username:      string;
  booking_url:   string;
  event_type_id?: number;
}

export interface ZoomIntegrationMeta {
  account_id: string;
  account_name: string;
}

// ─── OAuth state ──────────────────────────────────────────────────────────────

export interface OAuthState {
  workspace_id: string;
  workspace_slug: string;
  provider:     IntegrationProvider;
  return_to:    string;
}

// ─── Integration metadata per provider ───────────────────────────────────────

export type IntegrationCategory = 'calendar' | 'email' | 'meetings' | 'productivity' | 'ai';

export const INTEGRATION_META: Record<IntegrationProvider, {
  label:       string;
  description: string;
  category:    IntegrationCategory;
  icon:        string;     // Lucide icon name
  color:       string;
  scopes:      string[];
  /** AI providers use an API key instead of OAuth */
  authType?:   'oauth' | 'api_key';
}> = {
  google_calendar: {
    label:       'Google Calendar',
    description: 'Sync events, create meetings, and see your schedule alongside Spore.',
    category:    'calendar',
    icon:        'Calendar',
    color:       '#4285F4',
    scopes:      [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  },
  google_gmail: {
    label:       'Gmail',
    description: 'Read and send emails directly from your Spore inbox.',
    category:    'email',
    icon:        'Mail',
    color:       '#EA4335',
    scopes:      [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  },
  microsoft_calendar: {
    label:       'Outlook Calendar',
    description: 'Sync Microsoft calendar events and manage availability.',
    category:    'calendar',
    icon:        'Calendar',
    color:       '#0078D4',
    scopes:      ['Calendars.ReadWrite', 'offline_access'],
  },
  microsoft_outlook: {
    label:       'Outlook Mail',
    description: 'Connect your Outlook inbox to read and send emails from Spore.',
    category:    'email',
    icon:        'Mail',
    color:       '#0078D4',
    scopes:      ['Mail.ReadWrite', 'Mail.Send', 'offline_access'],
  },
  cal_com: {
    label:       'Cal.com',
    description: 'Share your booking link and let teammates schedule time with you.',
    category:    'meetings',
    icon:        'Link',
    color:       '#111827',
    scopes:      [],
  },
  zoom: {
    label:       'Zoom',
    description: 'Auto-generate Zoom links when creating meetings.',
    category:    'meetings',
    icon:        'Video',
    color:       '#2D8CFF',
    scopes:      ['meeting:write'],
  },
  slack: {
    label:       'Slack',
    description: 'Get Spore notifications in your Slack channels.',
    category:    'productivity',
    icon:        'MessageSquare',
    color:       '#4A154B',
    scopes:      ['incoming-webhook', 'chat:write'],
  },
  anthropic: {
    label:       'Claude (Anthropic)',
    description: 'Use Claude to write, summarize, and reason inside your pages.',
    category:    'ai',
    icon:        'Sparkles',
    color:       '#D4A574',
    scopes:      [],
    authType:    'api_key',
  },
  openai: {
    label:       'OpenAI / ChatGPT',
    description: 'Leverage GPT-4o and other OpenAI models for AI-powered features.',
    category:    'ai',
    icon:        'BrainCircuit',
    color:       '#10A37F',
    scopes:      [],
    authType:    'api_key',
  },
  google_gemini: {
    label:       'Google Gemini',
    description: 'Access Gemini Pro and Flash models via your Google AI Studio key.',
    category:    'ai',
    icon:        'Zap',
    color:       '#4285F4',
    scopes:      [],
    authType:    'api_key',
  },
  groq: {
    label:       'Groq',
    description: 'Ultra-fast inference for open-source models like Llama and Mixtral.',
    category:    'ai',
    icon:        'Cpu',
    color:       '#F55036',
    scopes:      [],
    authType:    'api_key',
  },
};
