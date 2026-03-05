import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WorkspaceShell } from '../WorkspaceShell';

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

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) redirect('/login');

  // Fetch profile for the TopBar avatar/name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle();

  const p = profile as { full_name: string | null; avatar_url: string | null; email: string } | null;

  return (
    <WorkspaceShell
      slug={workspace.slug}
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      rootId={workspace.root_id}
      user={{
        id:       user.id,
        email:    user.email ?? p?.email ?? '',
        name:     p?.full_name ?? null,
        avatarUrl: p?.avatar_url ?? null,
      }}
    >
      {children}
    </WorkspaceShell>
  );
}
