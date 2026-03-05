-- Allow workspace owner to add themselves as first member when creating a workspace.
-- The previous policy required get_workspace_role(workspace_id) IN ('owner','editor'),
-- but no row exists yet when creating a new workspace, so the insert was denied.

DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;

CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        -- Owners and editors can invite new members (existing behavior)
        public.get_workspace_role(workspace_id) IN ('owner', 'editor')
        OR
        -- Bootstrap: workspace owner can add themselves as first member
        (
            user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.workspaces w
                WHERE w.id = workspace_id AND w.owner_id = auth.uid()
            )
        )
    );
