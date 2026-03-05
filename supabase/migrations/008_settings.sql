-- ─── 008_settings.sql ────────────────────────────────────────────────────────
-- User settings, workspace settings, third-party integrations,
-- notification preferences, and workspace invitations.

-- ─── user_settings ───────────────────────────────────────────────────────────

CREATE TABLE user_settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  timezone    TEXT        NOT NULL DEFAULT 'UTC',
  date_format TEXT        NOT NULL DEFAULT 'MMM D, YYYY',
  time_format TEXT        NOT NULL DEFAULT '12h',         -- '12h' | '24h'
  start_of_week TEXT      NOT NULL DEFAULT 'monday',      -- 'monday' | 'sunday'
  language    TEXT        NOT NULL DEFAULT 'en',
  theme       TEXT        NOT NULL DEFAULT 'system',      -- 'light' | 'dark' | 'system'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── workspace_settings ──────────────────────────────────────────────────────

CREATE TABLE workspace_settings (
  workspace_id          UUID    PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  logo_url              TEXT,
  description           TEXT,
  website_url           TEXT,
  default_member_role   TEXT    NOT NULL DEFAULT 'editor', -- 'editor' | 'viewer'
  allow_public_pages    BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── integrations ────────────────────────────────────────────────────────────
-- Stores OAuth tokens and API keys for third-party providers.
-- provider values: 'google_calendar', 'google_gmail',
--                  'microsoft_calendar', 'microsoft_outlook',
--                  'cal_com', 'zoom', 'slack'

CREATE TABLE integrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id      UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  provider          TEXT        NOT NULL,
  access_token      TEXT,
  refresh_token     TEXT,
  token_expires_at  TIMESTAMPTZ,
  provider_user_id  TEXT,
  provider_email    TEXT,
  scopes            TEXT[]      DEFAULT '{}',
  metadata          JSONB       NOT NULL DEFAULT '{}',
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ─── notification_preferences ────────────────────────────────────────────────
-- event_type: 'meeting_reminder' | 'meeting_invite' | 'page_shared'
--             | 'comment_mention' | 'member_joined'
-- channel:    'email' | 'in_app' | 'push'

CREATE TABLE notification_preferences (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id     UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type       TEXT        NOT NULL,
  channel          TEXT        NOT NULL,
  enabled          BOOLEAN     NOT NULL DEFAULT true,
  advance_minutes  INTEGER,    -- for meeting_reminder: minutes before event
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, workspace_id, event_type, channel)
);

-- ─── workspace_invitations ───────────────────────────────────────────────────

CREATE TABLE workspace_invitations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_by   UUID        NOT NULL REFERENCES profiles(id),
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'editor',
  token        TEXT        UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX integrations_user_id_idx         ON integrations(user_id);
CREATE INDEX integrations_workspace_id_idx     ON integrations(workspace_id);
CREATE INDEX integrations_provider_idx         ON integrations(provider);
CREATE INDEX notif_prefs_user_id_idx           ON notification_preferences(user_id);
CREATE INDEX notif_prefs_workspace_id_idx      ON notification_preferences(workspace_id);
CREATE INDEX workspace_invitations_ws_idx      ON workspace_invitations(workspace_id);
CREATE INDEX workspace_invitations_token_idx   ON workspace_invitations(token);
CREATE INDEX workspace_invitations_email_idx   ON workspace_invitations(email);

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE user_settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations   ENABLE ROW LEVEL SECURITY;

-- user_settings: own row only
CREATE POLICY "user_settings_own" ON user_settings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- workspace_settings: members read, owner write
CREATE POLICY "workspace_settings_select" ON workspace_settings FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_settings_modify" ON workspace_settings FOR ALL
  USING  (get_workspace_role(workspace_id) = 'owner')
  WITH CHECK (get_workspace_role(workspace_id) = 'owner');

-- integrations: own row only
CREATE POLICY "integrations_own" ON integrations
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- notification_preferences: own rows only
CREATE POLICY "notif_prefs_own" ON notification_preferences
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- workspace_invitations: members read; owner insert/delete
CREATE POLICY "workspace_invitations_select" ON workspace_invitations FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_invitations_insert" ON workspace_invitations FOR INSERT
  WITH CHECK (get_workspace_role(workspace_id) = 'owner');

CREATE POLICY "workspace_invitations_delete" ON workspace_invitations FOR DELETE
  USING (get_workspace_role(workspace_id) = 'owner');

-- ─── Timestamp triggers ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_col()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER user_settings_ts
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();

CREATE TRIGGER workspace_settings_ts
  BEFORE UPDATE ON workspace_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();

CREATE TRIGGER integrations_ts
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
