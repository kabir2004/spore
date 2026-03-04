import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Browser (client component) Supabase client.
 * Call this inside 'use client' components and hooks.
 * Creates a new instance each call — wrap in useMemo if called frequently.
 */
export const createClient = () =>
    createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
