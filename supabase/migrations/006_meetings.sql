-- ─── Meetings ───────────────────────────────────────────────────────────────────
-- A meeting is a scheduled event with participants, timestamps, optional location/
-- join URL, and an optional linked notes page (a block of type 'page').

CREATE TABLE public.meetings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    description      TEXT,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ NOT NULL,
    status           TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    location         TEXT,                                          -- e.g. "Google Meet", "Conference Room A"
    join_url         TEXT,                                          -- video call URL
    notes_block_id   UUID REFERENCES public.blocks(id) ON DELETE SET NULL, -- linked page block for meeting notes
    created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Meeting Participants ────────────────────────────────────────────────────────
-- Supports both internal users (user_id) and external attendees (email only).

CREATE TABLE public.meeting_participants (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id   UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- null for external
    email        TEXT NOT NULL,                                             -- always required (internal or external)
    name         TEXT NOT NULL,
    role         TEXT NOT NULL DEFAULT 'attendee'
                 CHECK (role IN ('host', 'attendee')),
    rsvp_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (rsvp_status IN ('pending', 'accepted', 'declined')),
    UNIQUE (meeting_id, email)
);

-- ─── Indexes ────────────────────────────────────────────────────────────────────

-- Upcoming meetings per workspace (primary query: calendar/home views)
CREATE INDEX meetings_workspace_start_idx ON public.meetings(workspace_id, start_time);
-- Filter by status (upcoming, past, cancelled)
CREATE INDEX meetings_status_idx ON public.meetings(workspace_id, status);
-- Participant lookup by meeting
CREATE INDEX meeting_participants_meeting_idx ON public.meeting_participants(meeting_id);
-- Participant lookup by user (e.g. "which meetings am I in?")
CREATE INDEX meeting_participants_user_idx ON public.meeting_participants(user_id) WHERE user_id IS NOT NULL;

-- ─── Auto updated_at trigger ────────────────────────────────────────────────────

CREATE TRIGGER meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ─── RLS Policies ───────────────────────────────────────────────────────────────

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- Workspace members can read all meetings in their workspace
CREATE POLICY "meetings_select" ON public.meetings
    FOR SELECT USING (public.is_workspace_member(workspace_id));

-- Workspace members can create meetings
CREATE POLICY "meetings_insert" ON public.meetings
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));

-- Only the creator or a workspace owner/editor can update
CREATE POLICY "meetings_update" ON public.meetings
    FOR UPDATE USING (
        created_by = auth.uid()
        OR public.get_workspace_role(workspace_id) IN ('owner', 'editor')
    );

-- Only the creator or a workspace owner can delete
CREATE POLICY "meetings_delete" ON public.meetings
    FOR DELETE USING (
        created_by = auth.uid()
        OR public.get_workspace_role(workspace_id) = 'owner'
    );

-- Meeting participants: readable to workspace members
CREATE POLICY "meeting_participants_select" ON public.meeting_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND public.is_workspace_member(m.workspace_id)
        )
    );

-- Workspace members can insert participants
CREATE POLICY "meeting_participants_insert" ON public.meeting_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND public.is_workspace_member(m.workspace_id)
        )
    );

-- Meeting creator or owner/editor can update participants
CREATE POLICY "meeting_participants_update" ON public.meeting_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND (
                m.created_by = auth.uid()
                OR public.get_workspace_role(m.workspace_id) IN ('owner', 'editor')
              )
        )
    );

-- Meeting creator or owner can delete participants
CREATE POLICY "meeting_participants_delete" ON public.meeting_participants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.meetings m
            WHERE m.id = meeting_id
              AND (
                m.created_by = auth.uid()
                OR public.get_workspace_role(m.workspace_id) = 'owner'
              )
        )
    );
