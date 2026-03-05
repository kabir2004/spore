'use server';

import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import type { Meeting, CreateMeetingInput, UpdateMeetingInput, MeetingParticipant } from '@/lib/types/meeting';
import type { Database } from '@/lib/supabase/database.types';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Typed helpers so callers don't need any casts
const meetingsTable = (sb: SupabaseClient) =>
    sb.from('meetings') as ReturnType<SupabaseClient['from']> & {
        select: SupabaseClient['from'] extends (t: 'meetings') => infer R ? R : never;
    };

// Use the generated Database type for strongly-typed access
type MeetingRow = Database['public']['Tables']['meetings']['Row'];
type MeetingInsert = Database['public']['Tables']['meetings']['Insert'];
type MeetingUpdate = Database['public']['Tables']['meetings']['Update'];
type ParticipantRow = Database['public']['Tables']['meeting_participants']['Row'];
type ParticipantInsert = Database['public']['Tables']['meeting_participants']['Insert'];

/** Fetch all non-cancelled meetings for a workspace, with participants, ordered by start_time. */
export async function getMeetings(workspaceId: string): Promise<{ data: Meeting[] } | { error: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('meetings')
        .select('*, participants:meeting_participants(*)')
        .eq('workspace_id', workspaceId)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

    if (error) return { error: error.message };
    return { data: (data ?? []) as unknown as Meeting[] };
}

/** Fetch a single meeting by ID with participants. */
export async function getMeeting(id: string): Promise<{ data: Meeting } | { error: string }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('meetings')
        .select('*, participants:meeting_participants(*)')
        .eq('id', id)
        .single();

    if (error) return { error: error.message };
    return { data: data as unknown as Meeting };
}

/** Create a new meeting and optionally add participants. */
export async function createMeeting(input: CreateMeetingInput): Promise<{ data: Meeting } | { error: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const meetingId = uuidv4();

    const insert: MeetingInsert = {
        id: meetingId,
        workspace_id: input.workspace_id,
        title: input.title,
        description: input.description ?? null,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location ?? null,
        join_url: input.join_url ?? null,
        created_by: user.id,
    };

    const { data, error } = await supabase
        .from('meetings')
        .insert(insert)
        .select()
        .single();

    if (error) return { error: error.message };

    if (input.participants && input.participants.length > 0) {
        const rows: ParticipantInsert[] = input.participants.map((p) => ({
            id: uuidv4(),
            meeting_id: meetingId,
            email: p.email,
            name: p.name,
            role: p.role ?? 'attendee',
            rsvp_status: 'pending',
        }));
        const { error: pErr } = await supabase.from('meeting_participants').insert(rows);
        if (pErr) return { error: pErr.message };
    }

    return { data: data as unknown as Meeting };
}

/** Update meeting fields. */
export async function updateMeeting(
    id: string,
    updates: UpdateMeetingInput
): Promise<{ data: Meeting } | { error: string }> {
    const supabase = await createClient();

    const patch: MeetingUpdate = { ...updates };

    const { data, error } = await supabase
        .from('meetings')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: error.message };
    return { data: data as unknown as Meeting };
}

/** Soft-cancel a meeting (sets status → 'cancelled'). */
export async function cancelMeeting(id: string): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('meetings')
        .update({ status: 'cancelled' } satisfies MeetingUpdate)
        .eq('id', id);

    if (error) return { error: error.message };
    return { success: true };
}

/** Add a participant to an existing meeting. */
export async function addParticipant(
    meetingId: string,
    participant: { email: string; name: string; role?: 'host' | 'attendee'; userId?: string }
): Promise<{ data: MeetingParticipant } | { error: string }> {
    const supabase = await createClient();

    const insert: ParticipantInsert = {
        id: uuidv4(),
        meeting_id: meetingId,
        user_id: participant.userId ?? null,
        email: participant.email,
        name: participant.name,
        role: participant.role ?? 'attendee',
        rsvp_status: 'pending',
    };

    const { data, error } = await supabase
        .from('meeting_participants')
        .insert(insert)
        .select()
        .single();

    if (error) return { error: error.message };
    return { data: data as unknown as MeetingParticipant };
}

/** Update a participant's RSVP status. */
export async function updateRsvp(
    meetingId: string,
    email: string,
    status: 'accepted' | 'declined'
): Promise<{ success: true } | { error: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('meeting_participants')
        .update({ rsvp_status: status })
        .eq('meeting_id', meetingId)
        .eq('email', email);

    if (error) return { error: error.message };
    return { success: true };
}

/**
 * Link a notes page block to a meeting.
 * Creates a new 'page' block if no existingBlockId is provided.
 */
export async function linkMeetingNotes(
    meetingId: string,
    workspaceId: string,
    existingBlockId?: string
): Promise<{ notesBlockId: string } | { error: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    let notesBlockId = existingBlockId;

    if (!notesBlockId) {
        const { data: meeting } = await supabase
            .from('meetings')
            .select('title')
            .eq('id', meetingId)
            .single();

        const title = meeting ? `Notes: ${(meeting as MeetingRow).title}` : 'Meeting Notes';
        notesBlockId = uuidv4();
        const now = Date.now();

        const { error: blockError } = await supabase.from('blocks').insert({
            id: notesBlockId,
            workspace_id: workspaceId,
            type: 'page',
            properties: { title, icon: 'NotebookPen' },
            content: [],
            parent_id: null,
            created_by: user.id,
            last_edited_by: user.id,
            created_time: now,
            last_edited_time: now,
        });

        if (blockError) return { error: blockError.message };
    }

    const { error } = await supabase
        .from('meetings')
        .update({ notes_block_id: notesBlockId } satisfies MeetingUpdate)
        .eq('id', meetingId);

    if (error) return { error: error.message };
    return { notesBlockId };
}
