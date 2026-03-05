-- ─── 009_calendar_events.sql ─────────────────────────────────────────────────
-- Unified calendar events: Spore-native + synced from Google / Microsoft.

-- ─── Types ───────────────────────────────────────────────────────────────────

CREATE TYPE event_status    AS ENUM ('confirmed', 'tentative', 'cancelled');
CREATE TYPE event_source     AS ENUM ('spore', 'google', 'microsoft', 'cal_com');
CREATE TYPE attendee_response AS ENUM ('needsAction', 'accepted', 'declined', 'tentative');

-- ─── calendar_events ─────────────────────────────────────────────────────────

CREATE TABLE calendar_events (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by      UUID          REFERENCES profiles(id),

  -- Core event fields
  title           TEXT          NOT NULL,
  description     TEXT,
  start_time      TIMESTAMPTZ   NOT NULL,
  end_time        TIMESTAMPTZ   NOT NULL,
  all_day         BOOLEAN       NOT NULL DEFAULT false,
  timezone        TEXT          NOT NULL DEFAULT 'UTC',

  -- Location / virtual
  location        TEXT,
  join_url        TEXT,

  -- Status & visibility
  status          event_status  NOT NULL DEFAULT 'confirmed',

  -- Provider sync metadata
  source          event_source  NOT NULL DEFAULT 'spore',
  external_id     TEXT,          -- provider's own event ID
  calendar_id     TEXT,          -- provider calendar identifier
  integration_id  UUID          REFERENCES integrations(id) ON DELETE SET NULL,
  etag            TEXT,          -- Google Calendar change token

  -- Links to Spore objects
  meeting_id      UUID          REFERENCES meetings(id)    ON DELETE SET NULL,
  notes_block_id  UUID          REFERENCES blocks(id)      ON DELETE SET NULL,

  -- Recurrence (RRULE / RFC 5545)
  recurrence_rule TEXT,
  recurrence_id   TEXT,

  -- Visual
  color           TEXT,

  -- Flexible metadata
  metadata        JSONB         NOT NULL DEFAULT '{}',

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Prevent duplicate synced events
  UNIQUE (workspace_id, source, external_id)
);

-- ─── calendar_attendees ──────────────────────────────────────────────────────

CREATE TABLE calendar_attendees (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID              NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  user_id         UUID              REFERENCES profiles(id),
  email           TEXT              NOT NULL,
  name            TEXT,
  response_status attendee_response NOT NULL DEFAULT 'needsAction',
  is_organizer    BOOLEAN           NOT NULL DEFAULT false,
  comment         TEXT,
  UNIQUE (event_id, email)
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX cal_events_workspace_idx     ON calendar_events(workspace_id);
CREATE INDEX cal_events_start_time_idx    ON calendar_events(start_time);
CREATE INDEX cal_events_created_by_idx    ON calendar_events(created_by);
CREATE INDEX cal_events_source_idx        ON calendar_events(source);
CREATE INDEX cal_events_meeting_id_idx    ON calendar_events(meeting_id) WHERE meeting_id IS NOT NULL;
CREATE INDEX cal_events_external_id_idx   ON calendar_events(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX cal_attendees_event_id_idx   ON calendar_attendees(event_id);
CREATE INDEX cal_attendees_user_id_idx    ON calendar_attendees(user_id) WHERE user_id IS NOT NULL;

-- ─── Row-Level Security ──────────────────────────────────────────────────────

ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees  ENABLE ROW LEVEL SECURITY;

-- calendar_events
CREATE POLICY "cal_events_select" ON calendar_events FOR SELECT
  USING (is_workspace_member(workspace_id));

CREATE POLICY "cal_events_insert" ON calendar_events FOR INSERT
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "cal_events_update" ON calendar_events FOR UPDATE
  USING (
    is_workspace_member(workspace_id)
    AND (created_by = auth.uid() OR get_workspace_role(workspace_id) IN ('owner', 'editor'))
  );

CREATE POLICY "cal_events_delete" ON calendar_events FOR DELETE
  USING (
    created_by = auth.uid()
    OR get_workspace_role(workspace_id) = 'owner'
  );

-- calendar_attendees (inherits event membership check)
CREATE POLICY "cal_attendees_select" ON calendar_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_attendees.event_id
        AND is_workspace_member(ce.workspace_id)
    )
  );

CREATE POLICY "cal_attendees_write" ON calendar_attendees FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events ce
      WHERE ce.id = calendar_attendees.event_id
        AND is_workspace_member(ce.workspace_id)
    )
  );

-- ─── Timestamp trigger ───────────────────────────────────────────────────────

CREATE TRIGGER cal_events_ts
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_col();
