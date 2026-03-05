'server only';

import { createClient } from '@/lib/supabase/server';
import type {
  UserSettings,
  WorkspaceSettings,
  WorkspaceMember,
  WorkspaceInvitation,
  NotificationPreference,
  UpdateUserSettingsInput,
  UpdateWorkspaceSettingsInput,
  InviteMemberInput,
} from '@/lib/types/settings';

// ─── User Settings ────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettings | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await (supabase.from('user_settings') as any)
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return data as UserSettings | null;
}

export async function upsertUserSettings(
  input: UpdateUserSettingsInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await (supabase.from('user_settings') as any)
    .upsert({ user_id: user.id, ...input }, { onConflict: 'user_id' });

  return { error: error?.message ?? null };
}

export async function updateUserProfile(input: {
  full_name?: string;
  avatar_url?: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: input.full_name, avatar_url: input.avatar_url })
    .eq('id', user.id);

  if (profileError) return { error: profileError.message };

  // Mirror into user_settings
  const { error: settingsError } = await (supabase.from('user_settings') as any)
    .upsert(
      { user_id: user.id, full_name: input.full_name, avatar_url: input.avatar_url },
      { onConflict: 'user_id' }
    );

  return { error: settingsError?.message ?? null };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { error: 'Not authenticated' };

  // Verify current password by re-signing in
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) return { error: 'Current password is incorrect' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

export async function changeEmail(newEmail: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return { error: error?.message ?? null };
}

// ─── Workspace Settings ───────────────────────────────────────────────────────

export async function getWorkspaceSettings(
  workspaceId: string
): Promise<WorkspaceSettings | null> {
  const supabase = await createClient();
  const { data } = await (supabase.from('workspace_settings') as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  return data as WorkspaceSettings | null;
}

export async function upsertWorkspaceSettings(
  workspaceId: string,
  input: UpdateWorkspaceSettingsInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Update workspace name if provided
  if (input.name !== undefined) {
    const { error } = await supabase
      .from('workspaces')
      .update({ name: input.name })
      .eq('id', workspaceId);
    if (error) return { error: error.message };
  }

  const settingsPayload: Record<string, unknown> = { workspace_id: workspaceId };
  if (input.logo_url       !== undefined) settingsPayload.logo_url       = input.logo_url;
  if (input.description    !== undefined) settingsPayload.description    = input.description;
  if (input.website_url    !== undefined) settingsPayload.website_url    = input.website_url;
  if (input.default_member_role !== undefined) settingsPayload.default_member_role = input.default_member_role;
  if (input.allow_public_pages  !== undefined) settingsPayload.allow_public_pages  = input.allow_public_pages;

  const { error } = await (supabase.from('workspace_settings') as any)
    .upsert(settingsPayload, { onConflict: 'workspace_id' });

  return { error: error?.message ?? null };
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspace_members')
    .select(`
      user_id,
      role,
      joined_at,
      profiles (
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('workspace_id', workspaceId);

  if (!data) return [];

  return data.map((m: any) => ({
    user_id:    m.user_id,
    email:      m.profiles?.email ?? '',
    full_name:  m.profiles?.full_name ?? null,
    avatar_url: m.profiles?.avatar_url ?? null,
    role:       m.role,
    joined_at:  m.joined_at,
  }));
}

export async function updateMemberRole(
  workspaceId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}

export async function removeMember(
  workspaceId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  return { error: error?.message ?? null };
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function inviteMember(
  workspaceId: string,
  input: InviteMemberInput
): Promise<{ data: WorkspaceInvitation | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: 'Not authenticated' };

  const { data, error } = await (supabase.from('workspace_invitations') as any)
    .upsert(
      { workspace_id: workspaceId, invited_by: user.id, email: input.email, role: input.role },
      { onConflict: 'workspace_id,email' }
    )
    .select()
    .single();

  return { data: data as WorkspaceInvitation | null, error: error?.message ?? null };
}

export async function getPendingInvitations(
  workspaceId: string
): Promise<WorkspaceInvitation[]> {
  const supabase = await createClient();
  const { data } = await (supabase.from('workspace_invitations') as any)
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  return (data ?? []) as WorkspaceInvitation[];
}

export async function revokeInvitation(
  invitationId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await (supabase.from('workspace_invitations') as any)
    .delete()
    .eq('id', invitationId);

  return { error: error?.message ?? null };
}

// ─── Notification Preferences ─────────────────────────────────────────────────

export async function getNotificationPreferences(
  workspaceId: string
): Promise<NotificationPreference[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await (supabase.from('notification_preferences') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('workspace_id', workspaceId);

  return (data ?? []) as NotificationPreference[];
}

export async function upsertNotificationPreference(
  workspaceId: string,
  eventType: string,
  channel: string,
  enabled: boolean,
  advanceMinutes?: number
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await (supabase.from('notification_preferences') as any)
    .upsert(
      {
        user_id:         user.id,
        workspace_id:    workspaceId,
        event_type:      eventType,
        channel,
        enabled,
        advance_minutes: advanceMinutes ?? null,
      },
      { onConflict: 'user_id,workspace_id,event_type,channel' }
    );

  return { error: error?.message ?? null };
}
