import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { IntegrationsSettings } from '@/components/settings/IntegrationsSettings';
import { getIntegrations, disconnectIntegration, connectCalCom, connectAIProvider } from '@/lib/actions/integrations';
import { syncGoogleCalendar, syncMicrosoftCalendar } from '@/lib/actions/calendarEvents';
import type { IntegrationProvider } from '@/lib/types/integration';

export default async function IntegrationsPage({
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

  const integrations = await getIntegrations(workspace.id);

  async function handleDisconnect(provider: IntegrationProvider) {
    'use server';
    return disconnectIntegration(provider);
  }

  async function handleConnectCalCom(apiKey: string) {
    'use server';
    return connectCalCom(apiKey, workspace!.id);
  }

  async function handleSync(provider: 'google_calendar' | 'microsoft_calendar') {
    'use server';
    if (provider === 'google_calendar') {
      return syncGoogleCalendar(workspace!.id);
    }
    return syncMicrosoftCalendar(workspace!.id);
  }

  async function handleConnectAI(
    provider: 'anthropic' | 'openai' | 'google_gemini' | 'groq',
    apiKey: string
  ) {
    'use server';
    return connectAIProvider(provider, apiKey, workspace!.id);
  }

  return (
    <Suspense>
      <IntegrationsSettings
        integrations={integrations}
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        onDisconnect={handleDisconnect}
        onConnectCalCom={handleConnectCalCom}
        onConnectAI={handleConnectAI}
        onSync={handleSync}
      />
    </Suspense>
  );
}
