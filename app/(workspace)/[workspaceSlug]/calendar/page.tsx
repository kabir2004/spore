import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarPage } from '@/components/calendar/CalendarPage';
import { getCalendarEvents } from '@/lib/actions/calendarEvents';
import { getIntegrations } from '@/lib/actions/integrations';

export default async function CalendarRoute({
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

  // Fetch calendar events from Supabase (spore-native + synced external)
  const now       = new Date();
  const from      = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to        = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  const [events, integrations] = await Promise.all([
    getCalendarEvents(workspace.id, from, to),
    getIntegrations(workspace.id),
  ]);

  const hasGoogleCalendar    = integrations.some((i) => i.provider === 'google_calendar'    && i.is_active);
  const hasMicrosoftCalendar = integrations.some((i) => i.provider === 'microsoft_calendar' && i.is_active);

  return (
    <Suspense>
      <CalendarPage
        initialEvents={events}
        workspaceId={workspace.id}
        workspaceSlug={workspaceSlug}
        hasGoogleCalendar={hasGoogleCalendar}
        hasMicrosoftCalendar={hasMicrosoftCalendar}
      />
    </Suspense>
  );
}
