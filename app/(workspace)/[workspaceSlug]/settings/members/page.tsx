import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MembersSettings } from '@/components/settings/MembersSettings';
import {
  getWorkspaceMembers,
  getPendingInvitations,
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvitation,
} from '@/lib/actions/settings';
import type { MemberRole } from '@/lib/types/settings';

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) redirect('/login');

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const [members, pendingInvites] = await Promise.all([
    getWorkspaceMembers(workspace.id),
    getPendingInvitations(workspace.id),
  ]);

  async function handleInvite(email: string, role: MemberRole) {
    'use server';
    const result = await inviteMember(workspace!.id, { email, role });
    return { error: result.error };
  }

  async function handleChangeRole(userId: string, role: 'editor' | 'viewer') {
    'use server';
    return updateMemberRole(workspace!.id, userId, role);
  }

  async function handleRemoveMember(userId: string) {
    'use server';
    return removeMember(workspace!.id, userId);
  }

  async function handleRevokeInvite(inviteId: string) {
    'use server';
    return revokeInvitation(inviteId);
  }

  return (
    <MembersSettings
      currentUserId={user.id}
      currentUserRole={(membership?.role as MemberRole) ?? 'viewer'}
      members={members}
      pendingInvites={pendingInvites}
      onInvite={handleInvite}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
      onRevokeInvite={handleRevokeInvite}
    />
  );
}
