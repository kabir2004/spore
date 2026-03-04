export interface MeetingParticipant {
    id: string;
    meeting_id: string;
    user_id: string | null;   // null for external attendees
    email: string;
    name: string;
    role: 'host' | 'attendee';
    rsvp_status: 'pending' | 'accepted' | 'declined';
}

export interface Meeting {
    id: string;
    workspace_id: string;
    title: string;
    description: string | null;
    start_time: string;        // ISO 8601
    end_time: string;          // ISO 8601
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    location: string | null;
    join_url: string | null;
    notes_block_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    participants?: MeetingParticipant[];
}

export interface CreateMeetingInput {
    workspace_id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location?: string;
    join_url?: string;
    participants?: Array<{ email: string; name: string; role?: 'host' | 'attendee' }>;
}

export interface UpdateMeetingInput {
    title?: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    status?: Meeting['status'];
    location?: string;
    join_url?: string;
    notes_block_id?: string;
}
