-- ─── Enable Row Level Security ─────────────────────────────────────────────────
-- All tables are locked down by default; policies below grant precise access.

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks            ENABLE ROW LEVEL SECURITY;

-- ─── Helper Functions ──────────────────────────────────────────────────────────
-- SECURITY DEFINER means these run as the function owner (postgres), not the
-- caller, so they can read workspace_members without triggering its own RLS.
-- STABLE means Postgres can cache the result within a single statement.

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS public.workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
    LIMIT 1;
$$;

-- ─── Profiles Policies ─────────────────────────────────────────────────────────

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

-- Users in the same workspace can read each other's profiles
CREATE POLICY "profiles_select_coworkers"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.workspace_members wm1
            JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
              AND wm2.user_id = profiles.id
        )
    );

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ─── Workspaces Policies ───────────────────────────────────────────────────────

-- Any workspace member can read the workspace
CREATE POLICY "workspaces_select_members"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id));

-- Any authenticated user can create a workspace (must set themselves as owner)
CREATE POLICY "workspaces_insert_authenticated"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Only the owner can update workspace metadata (name, slug)
CREATE POLICY "workspaces_update_owner"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Only the owner can delete the workspace
CREATE POLICY "workspaces_delete_owner"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ─── Workspace Members Policies ────────────────────────────────────────────────

-- Any member can see who else is in their workspace
CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));

-- Owners and editors can invite new members
CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        public.get_workspace_role(workspace_id) IN ('owner', 'editor')
    );

-- Owners can update anyone's role; users can leave (update their own row)
CREATE POLICY "workspace_members_update"
    ON public.workspace_members FOR UPDATE
    USING (
        public.get_workspace_role(workspace_id) = 'owner'
        OR user_id = auth.uid()
    );

-- Owners can remove anyone; users can remove themselves (leave)
CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE
    USING (
        public.get_workspace_role(workspace_id) = 'owner'
        OR user_id = auth.uid()
    );

-- ─── Blocks Policies ───────────────────────────────────────────────────────────

-- Any workspace member can read non-deleted blocks
CREATE POLICY "blocks_select_members"
    ON public.blocks FOR SELECT
    USING (
        public.is_workspace_member(workspace_id)
        AND is_deleted = FALSE
    );

-- Any workspace member can create blocks
CREATE POLICY "blocks_insert_members"
    ON public.blocks FOR INSERT
    WITH CHECK (public.is_workspace_member(workspace_id));

-- Any workspace member can update blocks (content edits, reordering, etc.)
CREATE POLICY "blocks_update_members"
    ON public.blocks FOR UPDATE
    USING (public.is_workspace_member(workspace_id));

-- Only owners and editors can hard-delete blocks
-- (soft-delete via update is covered by blocks_update_members)
CREATE POLICY "blocks_delete_editors"
    ON public.blocks FOR DELETE
    USING (
        public.get_workspace_role(workspace_id) IN ('owner', 'editor')
    );

-- ─── Storage Policies ──────────────────────────────────────────────────────────
-- Files are stored at {workspace_id}/{block_id}/{filename}
-- The first path segment is the workspace_id.

CREATE POLICY "storage_workspace_access"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'block-assets'
        AND public.is_workspace_member(
            (storage.foldername(name))[1]::UUID
        )
    );
