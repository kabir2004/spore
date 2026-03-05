import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationsSettings } from '@/components/settings/NotificationsSettings';
import { getNotificationPreferences, upsertNotificationPreference } from '@/lib/actions/settings';
import type { NotificationEventType, NotificationChannel } from '@/lib/types/settings';

export default async function NotificationsPage({
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

  const preferences = await getNotificationPreferences(workspace.id);

  async function handleUpdate(
    eventType: NotificationEventType,
    channel: NotificationChannel,
    enabled: boolean,
    advanceMinutes?: number
  ) {
    'use server';
    return upsertNotificationPreference(
      workspace!.id,
      eventType,
      channel,
      enabled,
      advanceMinutes
    );
  }

  return (
    <NotificationsSettings
      preferences={preferences}
      onUpdate={handleUpdate}
    />
  );
}
