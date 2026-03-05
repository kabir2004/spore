'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import type { IBlock } from '@/lib/types/block';

/**
 * useWorkspaceSync — the bridge between Supabase and the Zustand store.
 *
 * Sequence (fixes the previous race condition):
 *  1. Subscribe to Supabase Realtime FIRST so no changes are missed.
 *  2. Buffer any Realtime events that arrive during the initial fetch.
 *  3. Fetch all non-deleted blocks and call hydrateWorkspace (replaces mock state).
 *  4. Flush the buffered events onto the hydrated store (merge if newer).
 *
 * Previous pattern started the subscription AFTER the fetch completed, meaning
 * any Realtime INSERT/UPDATE that fired during the 200–500ms fetch window was
 * silently dropped. This pattern closes that gap.
 *
 * The hook is idempotent: the `initialized` ref prevents double-fetch in
 * React StrictMode double-invocation.
 */
export function useWorkspaceSync(
    workspaceId: string,
    workspaceSlug: string,
    workspaceName: string,
    rootId: string
) {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const supabase = createClient();
        const store = useWorkspaceStore.getState();

        // Buffer for events that arrive while the initial fetch is in flight.
        const eventBuffer: Array<{ incoming: IBlock; isDeleted: boolean }> = [];
        let fetchComplete = false;

        // ── 1. Subscribe FIRST ───────────────────────────────────────────────
        const channel = supabase
            .channel(`workspace-blocks:${workspaceId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'blocks',
                    filter: `workspace_id=eq.${workspaceId}`,
                },
                (payload) => {
                    if (payload.eventType !== 'INSERT' && payload.eventType !== 'UPDATE') return;

                    const row = payload.new as Record<string, unknown>;
                    const isDeleted = row.is_deleted === true;

                    const incoming: IBlock = {
                        id: row.id as string,
                        type: row.type as IBlock['type'],
                        properties: (row.properties as IBlock['properties']) ?? {},
                        content: (row.content as string[]) ?? [],
                        parent_id: (row.parent_id as string) ?? null,
                        created_time: row.created_time as number,
                        last_edited_time: row.last_edited_time as number,
                    };

                    if (!fetchComplete) {
                        // Fetch still in flight — buffer the event
                        eventBuffer.push({ incoming, isDeleted });
                        return;
                    }

                    // Fetch is done — apply directly
                    applyIncoming(incoming, isDeleted);
                }
            )
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[useWorkspaceSync] Realtime subscription issue:', status);
                }
            });

        // ── 2. Initial fetch ─────────────────────────────────────────────────
        const loadBlocks = async () => {
            const { data, error } = await supabase
                .from('blocks')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('is_deleted', false)
                .order('created_time', { ascending: true });

            if (error) {
                console.error('[useWorkspaceSync] Initial load failed:', error.message);
                fetchComplete = true;
                return;
            }

            const blocks: IBlock[] = (data ?? []).map((row) => {
                const r = row as Record<string, unknown>;
                return {
                    id: r.id as string,
                    type: r.type as IBlock['type'],
                    properties: (r.properties as IBlock['properties']) ?? {},
                    content: (r.content as string[]) ?? [],
                    parent_id: (r.parent_id as string) ?? null,
                    created_time: r.created_time as number,
                    last_edited_time: r.last_edited_time as number,
                };
            });

            // Atomically replace store (clears mock state)
            store.hydrateWorkspace(workspaceSlug, workspaceName, rootId, blocks);

            // ── 3. Flush buffered events ──────────────────────────────────────
            fetchComplete = true;
            for (const { incoming, isDeleted } of eventBuffer) {
                applyIncoming(incoming, isDeleted);
            }
            eventBuffer.length = 0;
        };

        loadBlocks();

        return () => {
            supabase.removeChannel(channel);
        };
    // workspaceId is stable for the lifetime of the workspace layout — safe dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);
}

/** Merge or delete a single incoming block into the live Zustand store. */
function applyIncoming(incoming: IBlock, isDeleted: boolean) {
    const currentStore = useWorkspaceStore.getState();

    if (isDeleted) {
        const block = currentStore.blocks[incoming.id];
        if (block) {
            currentStore.deleteBlock(incoming.id, block.parent_id ?? undefined);
        }
        return;
    }

    // Only merge if the remote version is newer than what we have locally.
    // This prevents Realtime from clobbering in-flight local edits.
    const local = currentStore.blocks[incoming.id];
    if (!local || incoming.last_edited_time > local.last_edited_time) {
        currentStore.addBlock(incoming);
    }
}
