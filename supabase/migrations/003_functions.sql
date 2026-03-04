-- ─── Recursive Descendant Collector ───────────────────────────────────────────
-- Used by the deleteBlock server action to soft-delete a block and all its
-- descendants in a single round-trip (avoids N+1 queries from app layer).
--
-- Returns a table of all descendant block IDs (does NOT include root_id itself).
-- Example: get_block_descendants('page-uuid') → all child, grandchild, etc. IDs.

CREATE OR REPLACE FUNCTION public.get_block_descendants(root_id UUID)
RETURNS TABLE(id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH RECURSIVE descendants AS (
        -- Base case: direct children of root_id
        SELECT b.id
        FROM public.blocks b
        WHERE b.parent_id = root_id
          AND NOT b.is_deleted

        UNION ALL

        -- Recursive case: children of children
        SELECT b.id
        FROM public.blocks b
        JOIN descendants d ON b.parent_id = d.id
        WHERE NOT b.is_deleted
    )
    SELECT id FROM descendants;
$$;

-- ─── Workspace Blocks Fetcher ──────────────────────────────────────────────────
-- Fetches all active blocks for a workspace by slug.
-- Avoids the need for a JOIN in the application layer.

CREATE OR REPLACE FUNCTION public.get_workspace_blocks(p_slug TEXT)
RETURNS SETOF public.blocks
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT b.*
    FROM public.blocks b
    JOIN public.workspaces w ON b.workspace_id = w.id
    WHERE w.slug = p_slug
      AND NOT b.is_deleted
      AND public.is_workspace_member(b.workspace_id);
$$;
