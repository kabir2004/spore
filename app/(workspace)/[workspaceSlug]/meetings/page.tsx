import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getMeetings } from '@/lib/actions/meetings';
import { MeetingsView } from '@/components/workspace/MeetingsView';
import { redirect } from 'next/navigation';

interface MeetingsPageProps {
    params: Promise<{ workspaceSlug: string }>;
}

export default async function MeetingsPage({ params }: MeetingsPageProps) {
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

    const workspaceId = (workspace as { id: string }).id;
    const result = await getMeetings(workspaceId);
    const meetings = 'data' in result ? result.data : [];

    return (
        <Suspense>
            <MeetingsView
                meetings={meetings}
                workspaceSlug={workspaceSlug}
                workspaceId={workspaceId}
            />
        </Suspense>
    );
}
