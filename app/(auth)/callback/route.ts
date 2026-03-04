import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * OAuth callback handler.
 * Supabase redirects here after Google (or any OAuth provider) login.
 * Exchanges the auth code for a session, then creates a workspace for
 * first-time OAuth users who don't have one yet.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`);
    }

    const supabase = await createClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.user) {
        return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const user = sessionData.user;

    // Check if this user already has a workspace
    const { data: existingWorkspace } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    const slug = (existingWorkspace as { slug?: string } | null)?.slug;
    if (slug) {
        return NextResponse.redirect(`${origin}/${slug}`);
    }

    // First-time OAuth user — create their workspace
    const fullName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User';
    const email = user.email ?? '';
    const newSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'workspace';

    const workspaceId = uuidv4();
    const rootId = uuidv4();
    const now = Date.now();

    // Supabase client types can infer 'never' for insert; assert to unblock build.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('workspaces') as any).insert({
        id: workspaceId,
        name: `${fullName}'s Workspace`,
        slug: newSlug,
        root_id: rootId,
        owner_id: user.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('workspace_members') as any).insert({
        workspace_id: workspaceId,
        user_id: user.id,
        role: 'owner',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('blocks') as any).insert({
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

    return NextResponse.redirect(`${origin}/${newSlug}`);
}
