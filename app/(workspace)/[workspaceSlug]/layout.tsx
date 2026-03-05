import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WorkspaceShell } from '../WorkspaceShell';

/**
 * Workspace-by-slug layout — runs for /[workspaceSlug]/... (e.g. /admin, /user).
 * Validates session and workspace membership, then renders WorkspaceShell.
 * This layout receives params.workspaceSlug from the route segment.
 */
export default async function WorkspaceSlugLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ workspaceSlug: string }>;
}) {
    const { workspaceSlug } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: workspaceData } = await supabase
        .from('workspaces')
        .select('id, name, root_id, slug')
        .eq('slug', workspaceSlug)
        .single();

    const workspace = workspaceData as { id: string; name: string; root_id: string; slug: string } | null;
    if (!workspace) redirect('/login');

    // Verify the current user is a member of this workspace.
    // RLS guards the data layer, but we need this explicit check for a proper redirect.
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user.id)
        .maybeSingle();
    if (!membership) redirect('/login');

    return (
        <WorkspaceShell
            slug={workspace.slug}
            workspaceId={workspace.id}
            workspaceName={workspace.name}
            rootId={workspace.root_id}
        >
            {children}
        </WorkspaceShell>
    );
}
