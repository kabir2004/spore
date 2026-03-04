'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';
import type { IBlock } from '@/lib/types/block';

/**
 * useWorkspaceSync — the bridge between Supabase and the Zustand store.
 *
 * On mount:
 *  1. Fetches all non-deleted blocks for the workspace from Supabase.
 *  2. Hydrates the Zustand store (addBlock for each row).
 *  3. Subscribes to Supabase Realtime Postgres Changes for this workspace.
 *     — INSERT / UPDATE events merge into Zustand (newer timestamp wins).
 *     — Soft-delete (UPDATE with is_deleted=true) removes the block from UI.
 *
 * This hook is idempotent: the `initialized` ref prevents double-fetch in
 * React StrictMode double-invocation.
 *
 * The hook deliberately does NOT return any state. All data flows through
 * the Zustand store — components read from there as before.
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

        // ── 1. Initial load ──────────────────────────────────────────────────
        const loadBlocks = async () => {
            const { data, error } = await supabase
                .from('blocks')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('is_deleted', false)
                .order('created_time', { ascending: true });

            if (error) {
                console.error('[useWorkspaceSync] Initial load failed:', error.message);
                return;
            }

            // Map all rows to IBlock and atomically replace store (clears mock state)
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

            store.hydrateWorkspace(workspaceSlug, workspaceName, rootId, blocks);
        };

        loadBlocks();

        // ── 2. Realtime subscription ─────────────────────────────────────────
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
                    const currentStore = useWorkspaceStore.getState();

                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const row = payload.new as Record<string, unknown>;

                        // Soft-delete: remove from Zustand when is_deleted becomes true
                        if (row.is_deleted === true) {
                            const block = currentStore.blocks[row.id as string];
                            if (block) {
                                currentStore.deleteBlock(row.id as string, block.parent_id ?? undefined);
                            }
                            return;
                        }

                        const incomingBlock: IBlock = {
                            id: row.id as string,
                            type: row.type as IBlock['type'],
                            properties: (row.properties as IBlock['properties']) ?? {},
                            content: (row.content as string[]) ?? [],
                            parent_id: (row.parent_id as string) ?? null,
                            created_time: row.created_time as number,
                            last_edited_time: row.last_edited_time as number,
                        };

                        // Only merge if the remote version is newer than local.
                        // This prevents Realtime from clobbering in-flight local edits.
                        const localBlock = currentStore.blocks[incomingBlock.id];
                        if (!localBlock || incomingBlock.last_edited_time > localBlock.last_edited_time) {
                            currentStore.addBlock(incomingBlock);
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Realtime is connected — no action needed
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[useWorkspaceSync] Realtime subscription issue:', status);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    // workspaceId is stable for the lifetime of the workspace layout — safe dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);
}
