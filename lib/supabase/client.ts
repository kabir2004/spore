import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (local) or your hosting env (e.g. Vercel). Get them from: https://supabase.com/dashboard/project/_/settings/api'
    );
}

/**
 * Browser (client component) Supabase client.
 * Call this inside 'use client' components and hooks.
 * Creates a new instance each call — wrap in useMemo if called frequently.
 */
export const createClient = () =>
    createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
