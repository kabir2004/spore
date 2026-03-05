import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { WorkspaceSettingsView } from '@/components/settings/WorkspaceSettings';
import { getWorkspaceSettings, upsertWorkspaceSettings } from '@/lib/actions/settings';
import type { UpdateWorkspaceSettingsInput } from '@/lib/types/settings';

export default async function WorkspaceSettingsPage({
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

  const settings = await getWorkspaceSettings(workspace.id);

  async function handleSave(input: UpdateWorkspaceSettingsInput) {
    'use server';
    return upsertWorkspaceSettings(workspace!.id, input);
  }

  return (
    <WorkspaceSettingsView
      workspaceName={workspace.name}
      settings={settings}
      onSave={handleSave}
    />
  );
}
