import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InboxPage } from '@/components/inbox/InboxPage';
import { getIntegrations } from '@/lib/actions/integrations';

export default async function InboxRoute({
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
    .select('id')
    .eq('slug', workspaceSlug)
    .single();

  if (!workspace) redirect('/login');

  // Check for connected email integrations
  const integrations = await getIntegrations(workspace.id);
  const gmailIntegration   = integrations.find((i) => i.provider === 'google_gmail'       && i.is_active);
  const outlookIntegration = integrations.find((i) => i.provider === 'microsoft_outlook'  && i.is_active);

  return (
    <InboxPage
      workspaceId={workspace.id}
      workspaceSlug={workspaceSlug}
      connectedGmail={gmailIntegration?.provider_email ?? null}
      connectedOutlook={outlookIntegration?.provider_email ?? null}
    />
  );
}
