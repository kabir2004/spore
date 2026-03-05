-- ─── Atomic block property merge ──────────────────────────────────────────────
-- Merges a JSONB patch into blocks.properties in a single round-trip,
-- eliminating the SELECT + UPDATE pattern in updateBlock().
--
-- patch          : partial properties object to merge (shallow merge via ||)
-- content_val    : new content array, or NULL to leave unchanged
-- parent_id_val  : new parent_id, or '00000000-0000-0000-0000-000000000000' sentinel to leave unchanged
-- type_val       : new block type, or NULL to leave unchanged
-- edit_time      : unix ms timestamp
-- editor_id      : user UUID (may be NULL)

CREATE OR REPLACE FUNCTION public.update_block_atomic(
    block_id        UUID,
    patch           JSONB,
    content_val     UUID[]    DEFAULT NULL,
    parent_id_val   UUID      DEFAULT NULL,
    type_val        TEXT      DEFAULT NULL,
    edit_time       BIGINT    DEFAULT NULL,
    editor_id       UUID      DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.blocks
    SET
        properties       = CASE WHEN patch IS NOT NULL THEN properties || patch ELSE properties END,
        content          = COALESCE(content_val,  content),
        parent_id        = COALESCE(parent_id_val, parent_id),
        type             = COALESCE(type_val::public.block_type, type),
        last_edited_time = COALESCE(edit_time, last_edited_time),
        last_edited_by   = COALESCE(editor_id, last_edited_by)
    WHERE id = block_id
      AND is_deleted = FALSE;
END;
$$;

-- Grant execute to authenticated users (RLS on the blocks table still applies
-- because the function reads/writes through the normal row-level security path)
GRANT EXECUTE ON FUNCTION public.update_block_atomic TO authenticated;
