'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from '@/lib/store/workspaceStore';

/**
 * Rehydrates persisted workspace state from localStorage after mount.
 * Required when using persist with skipHydration: true to avoid SSR/client mismatch.
 */
export function StoreRehydrate() {
    useEffect(() => {
        useWorkspaceStore.persist.rehydrate();
    }, []);
    return null;
}
