'use server';

import { createClient } from '@/lib/supabase/server';
import type { IBlock } from '@/lib/types/block';

/**
 * Converts a Supabase blocks row to an IBlock for the Zustand store.
 * The schema maps 1:1 — this is intentional to keep the sync layer trivial.
 */
function rowToIBlock(row: Record<string, unknown>): IBlock {
    return {
        id: row.id as string,
        type: row.type as IBlock['type'],
        properties: (row.properties as IBlock['properties']) ?? {},
        content: (row.content as string[]) ?? [],
        parent_id: (row.parent_id as string) ?? null,
        created_time: row.created_time as number,
        last_edited_time: row.last_edited_time as number,
    };
}

/**
 * Fetch all non-deleted blocks for a workspace (by workspace ID).
 * Used by useWorkspaceSync on initial page load to hydrate the Zustand store.
 */
export async function getWorkspaceBlocks(workspaceId: string): Promise<IBlock[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false)
        .order('created_time', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToIBlock);
}

/**
 * Fetch a single block by ID.
 */
export async function getBlock(id: string): Promise<IBlock | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

    if (error || !data) return null;
    return rowToIBlock(data as Record<string, unknown>);
}

/**
 * Create a new block.
 * Called fire-and-forget from BlockRenderer/BlockEditor after Zustand is updated.
 * The block ID is generated client-side (uuidv4) before calling this.
 */
export async function createBlock(block: IBlock, workspaceId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('blocks').insert({
        id: block.id,
        workspace_id: workspaceId,
        type: block.type,
        properties: block.properties,
        content: block.content,
        parent_id: block.parent_id,
        created_by: user?.id ?? null,
        last_edited_by: user?.id ?? null,
        created_time: block.created_time,
        last_edited_time: block.last_edited_time,
    });

    if (error) throw new Error(`createBlock failed: ${error.message}`);
}

/**
 * Update a block's mutable fields.
 * Uses update_block_atomic() — a single Postgres RPC call that merges
 * properties via JSONB || operator, eliminating the prior SELECT + UPDATE pattern.
 */
export async function updateBlock(id: string, updates: Partial<IBlock>): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('update_block_atomic', {
        block_id:      id,
        patch:         updates.properties ?? null,
        content_val:   updates.content   ?? null,
        parent_id_val: updates.parent_id ?? null,
        type_val:      updates.type      ?? null,
        edit_time:     Date.now(),
        editor_id:     user?.id          ?? null,
    });

    if (error) throw new Error(`updateBlock failed: ${error.message}`);
}

/**
 * Soft-delete a block and all its descendants in one round-trip.
 * Uses the get_block_descendants Postgres function defined in 003_functions.sql.
 */
export async function deleteBlock(id: string): Promise<void> {
    const supabase = await createClient();

    const { data: descendants, error: fnError } = await supabase.rpc('get_block_descendants', { root_id: id });

    if (fnError) throw new Error(`deleteBlock descendant fetch failed: ${fnError.message}`);

    const ids = [id, ...(descendants ?? []).map((r: { id: string }) => r.id)];
    const now = new Date().toISOString();

    const { error } = await supabase
        .from('blocks')
        .update({ is_deleted: true, deleted_at: now })
        .in('id', ids);

    if (error) throw new Error(`deleteBlock failed: ${error.message}`);
}

/**
 * Reorder the children of a parent block.
 * Writes the new content array to the parent block.
 */
export async function reorderBlocks(parentId: string, newChildOrder: string[]): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('blocks')
        .update({
            content: newChildOrder,
            last_edited_time: Date.now(),
            last_edited_by: user?.id ?? null,
        })
        .eq('id', parentId);

    if (error) throw new Error(`reorderBlocks failed: ${error.message}`);
}
