'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { getAuthErrorMessage } from '@/lib/auth-messages';

/**
 * Base URL for the current request (used for OAuth redirects, email links, etc.).
 * Uses request Host header in production so redirects stay on the deployed domain
 * even when NEXT_PUBLIC_SITE_URL is not set.
 */
async function getBaseUrl(): Promise<string> {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) return siteUrl;

    try {
        const h = await headers();
        const host = h.get('x-forwarded-host') ?? h.get('host');
        const proto = h.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https');
        if (host) return `${proto}://${host}`;
    } catch {
        // headers() can throw in some edge cases
    }
    return 'http://localhost:3000';
}

/**
 * Derives a URL-safe workspace slug from an email address.
 * "Jane.Doe+work@gmail.com" → "janedoe"
 */
function slugFromEmail(email: string): string {
    return email
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30)
        || 'workspace';
}

/**
 * Returns a workspace slug that is guaranteed to be unique in the DB.
 * If the base slug is taken, appends a random 4-char suffix and retries.
 * e.g. "john" → "john" (if free) or "john-a3f7" (if taken).
 */
async function uniqueSlug(supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>, base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 0; attempt < 10; attempt++) {
        const { data } = await supabase
            .from('workspaces')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle();
        if (!data) return candidate;
        // Collision — append a random 4-char hex suffix
        const suffix = Math.random().toString(16).slice(2, 6);
        candidate = `${base.slice(0, 25)}-${suffix}`;
    }
    // Extremely unlikely fallback
    return `ws-${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Sign up a new user. On success:
 *  - Creates their Supabase auth account
 *  - Creates a workspace + root block in the DB (unless email confirmation is required)
 *  - Redirects them into their new workspace (or returns needToConfirmEmail)
 * On failure, returns { error: string }. On email confirmation required, returns { needToConfirmEmail: true, error?: string }.
 */
export async function signUp(
    email: string,
    password: string,
    fullName: string
): Promise<{ error: string } | { needToConfirmEmail: true; message?: string } | never> {
    const supabase = await createClient();
    const baseUrl = await getBaseUrl();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { full_name: fullName },
            emailRedirectTo: `${baseUrl}/auth/confirm`,
        },
    });

    if (error) return { error: getAuthErrorMessage(error.message) };
    if (!data.user) return { error: 'Signup failed. Please try again.' };

    // If Supabase is set to require email confirmation, session may be null and we don't create workspace yet
    const session = data.session;
    if (!session) {
        return {
            needToConfirmEmail: true,
            message: 'Check your email to confirm your account. Then sign in to get started.',
        };
    }

    const userId = data.user.id;
    const slug = await uniqueSlug(supabase, slugFromEmail(email));
    const workspaceId = uuidv4();
    const rootId = uuidv4();
    const now = Date.now();

    // Insert workspace
    const { error: wsError } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name: `${fullName || email}'s Workspace`,
        slug,
        root_id: rootId,
        owner_id: userId,
    });
    if (wsError) return { error: getAuthErrorMessage(wsError.message) };

    // Insert owner membership
    const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: 'owner',
    });
    if (memberError) return { error: getAuthErrorMessage(memberError.message) };

    // Insert root page block
    const { error: blockError } = await supabase.from('blocks').insert({
        id: rootId,
        workspace_id: workspaceId,
        type: 'page',
        properties: { title: `${fullName || email}'s Workspace`, icon: 'Home' },
        content: [],
        parent_id: null,
        created_by: userId,
        last_edited_by: userId,
        created_time: now,
        last_edited_time: now,
    });
    if (blockError) return { error: getAuthErrorMessage(blockError.message) };

    redirect(`/${slug}`);
}

/**
 * Sign in an existing user with email + password.
 * On success redirects to their workspace (server-side) so session cookies are applied.
 */
export async function signIn(
    email: string,
    password: string
): Promise<{ error: string } | never> {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: getAuthErrorMessage(error.message) };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Session error. Please try again.' };

    // Find this user's first workspace (by ownership)
    const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    const signInSlug = (workspaceData as { slug?: string } | null)?.slug;
    if (signInSlug) {
        redirect(`/${signInSlug}`);
    }

    // No workspace (e.g. seed account created in Auth but workspace failed) — create one now
    const ensured = await ensureWorkspaceForCurrentUser();
    if ('error' in ensured) {
        return { error: ensured.error };
    }
    redirect(`/${ensured.slug}`);
}

/**
 * Initiate Google OAuth sign-in.
 * Returns the OAuth URL to redirect the browser to.
 */
export async function signInWithGoogle(): Promise<{ url: string } | { error: string }> {
    const supabase = await createClient();
    const baseUrl = await getBaseUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${baseUrl}/auth/callback`,
            queryParams: { access_type: 'offline', prompt: 'consent' },
        },
    });

    if (error) return { error: getAuthErrorMessage(error.message) };
    return { url: data.url };
}

/**
 * Initiate Microsoft OAuth sign-in.
 * Returns the OAuth URL to redirect the browser to.
 */
export async function signInWithMicrosoft(): Promise<{ url: string } | { error: string }> {
    const supabase = await createClient();
    const baseUrl = await getBaseUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
            redirectTo: `${baseUrl}/auth/callback`,
        },
    });

    if (error) return { error: getAuthErrorMessage(error.message) };
    return { url: data.url };
}

/**
 * Sign out the current user and redirect to /login.
 */
export async function signOut(): Promise<never> {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
}

/**
 * Send a password reset email to the given address.
 */
export async function requestPasswordReset(email: string): Promise<{ error: string } | { success: true }> {
    const supabase = await createClient();
    const baseUrl = await getBaseUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${baseUrl}/auth/callback?next=/login`,
    });
    if (error) return { error: getAuthErrorMessage(error.message) };
    return { success: true };
}

/**
 * Ensure the current user has a workspace (create one if not). Used after email confirmation.
 * Returns the workspace slug to redirect to.
 */
export async function ensureWorkspaceForCurrentUser(): Promise<{ error: string } | { slug: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

    const wsSlug = (workspaceData as { slug?: string } | null)?.slug;
    if (wsSlug) return { slug: wsSlug };

    const fullName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User';
    const email = user.email ?? '';
    const slug = await uniqueSlug(supabase, slugFromEmail(email));
    const workspaceId = uuidv4();
    const rootId = uuidv4();
    const now = Date.now();

    const { error: wsError } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name: `${fullName}'s Workspace`,
        slug,
        root_id: rootId,
        owner_id: user.id,
    });
    if (wsError) return { error: getAuthErrorMessage(wsError.message) };

    const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner',
    });
    if (memberError) return { error: getAuthErrorMessage(memberError.message) };

    const { error: blockError } = await supabase.from('blocks').insert({
        id: rootId,
        workspace_id: workspaceId,
        type: 'page',
        properties: { title: `${fullName}'s Workspace`, icon: 'Home' },
        content: [],
        parent_id: null,
        created_by: user.id,
        last_edited_by: user.id,
        created_time: now,
        last_edited_time: now,
    });
    if (blockError) return { error: getAuthErrorMessage(blockError.message) };

    return { slug };
}

/**
 * Create demo accounts (admin, user, test) using the service role.
 * Only runs when SUPABASE_SERVICE_ROLE_KEY is set.
 * Returns a message for the UI.
 */
export async function createDemoAccounts(): Promise<{ error: string } | { message: string }> {
    let supabase;
    try {
        const { createServiceRoleClient } = await import('@/lib/supabase/service-role');
        supabase = createServiceRoleClient();
    } catch {
        return { error: 'Service role key not set. Add SUPABASE_SERVICE_ROLE_KEY to .env.local, then run: npm run db:seed-accounts' };
    }

    const { v4: uuidv4 } = await import('uuid');

    const accounts = [
        { email: 'admin@spore.local', password: 'sporeAdmin1!', fullName: 'spore Admin', accountRole: 'admin', slug: 'admin' },
        { email: 'user@spore.local', password: 'sporeUser1!', fullName: 'spore User', accountRole: 'user', slug: 'user' },
        { email: 'test@spore.local', password: 'sporeTest1!', fullName: 'spore Test', accountRole: 'test', slug: 'test' },
    ];

    for (const { email, password, fullName, accountRole, slug } of accounts) {
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === email);
        let userId: string;

        if (existing) {
            userId = existing.id;
        } else {
            const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName, account_role: accountRole },
            });
            if (createErr) return { error: `Failed to create ${email}: ${createErr.message}` };
            userId = newUser.user.id;
        }

        const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', userId).limit(1).single();
        if (ws) continue;

        const workspaceId = uuidv4();
        const rootId = uuidv4();
        const now = Date.now();
        const { error: wsErr } = await supabase.from('workspaces').insert({
            id: workspaceId,
            name: `${fullName}'s Workspace`,
            slug,
            root_id: rootId,
            owner_id: userId,
        });
        if (wsErr) return { error: `Workspace failed for ${email}: ${wsErr.message}` };
        const { error: memberErr } = await supabase.from('workspace_members').insert({
            workspace_id: workspaceId,
            user_id: userId,
            role: 'owner',
        });
        if (memberErr) return { error: `Member failed for ${email}: ${memberErr.message}` };
        const { error: blockErr } = await supabase.from('blocks').insert({
            id: rootId,
            workspace_id: workspaceId,
            type: 'page',
            properties: { title: `${fullName}'s Workspace`, icon: 'Home' },
            content: [],
            parent_id: null,
            created_by: userId,
            last_edited_by: userId,
            created_time: now,
            last_edited_time: now,
        });
        if (blockErr) return { error: `Block failed for ${email}: ${blockErr.message}` };
    }

    return { message: 'Demo accounts ready. Sign in with user@spore.local / sporeUser1!' };
}
