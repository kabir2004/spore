/**
 * Hand-written database types that mirror the Supabase schema.
 * Replace with auto-generated types once you have a Supabase project:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 *
 * Formatted for @supabase/supabase-js v2.x — each table needs Row/Insert/Update/Relationships.
 * Last updated: includes meetings + meeting_participants (006_meetings.sql)
 *               and update_block_atomic RPC (007_atomic_block_update.sql)
 */

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type MeetingRole = 'host' | 'attendee';
export type RsvpStatus = 'pending' | 'accepted' | 'declined';
export type AccountRole = 'admin' | 'user' | 'test';
export type BlockType =
    | 'page' | 'text' | 'h1' | 'h2' | 'h3'
    | 'bulleted_list_item' | 'numbered_list_item'
    | 'to_do' | 'toggle' | 'quote' | 'callout' | 'code'
    | 'image' | 'video' | 'audio' | 'file'
    | 'bookmark' | 'embed' | 'equation' | 'divider';

// supabase-js v2.x requires `type` (not `interface`) and Relationships on every table.
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    account_role: AccountRole;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    account_role?: AccountRole;
                };
                Update: {
                    full_name?: string | null;
                    avatar_url?: string | null;
                    account_role?: AccountRole;
                };
                Relationships: [];
            };
            workspaces: {
                Row: {
                    id: string;
                    name: string;
                    slug: string;
                    root_id: string;
                    owner_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    slug: string;
                    root_id: string;
                    owner_id: string;
                };
                Update: {
                    name?: string;
                    slug?: string;
                };
                Relationships: [];
            };
            workspace_members: {
                Row: {
                    workspace_id: string;
                    user_id: string;
                    role: WorkspaceRole;
                    invited_by: string | null;
                    joined_at: string;
                };
                Insert: {
                    workspace_id: string;
                    user_id: string;
                    role?: WorkspaceRole;
                    invited_by?: string | null;
                };
                Update: {
                    role?: WorkspaceRole;
                };
                Relationships: [];
            };
            blocks: {
                Row: {
                    id: string;
                    workspace_id: string;
                    type: BlockType;
                    properties: Record<string, unknown>;
                    content: string[];
                    parent_id: string | null;
                    created_by: string | null;
                    created_time: number;
                    last_edited_time: number;
                    last_edited_by: string | null;
                    is_deleted: boolean;
                    deleted_at: string | null;
                };
                Insert: {
                    id: string;
                    workspace_id: string;
                    type: BlockType;
                    properties?: Record<string, unknown>;
                    content?: string[];
                    parent_id?: string | null;
                    created_by?: string | null;
                    created_time: number;
                    last_edited_time: number;
                    last_edited_by?: string | null;
                };
                Update: {
                    type?: BlockType;
                    properties?: Record<string, unknown>;
                    content?: string[];
                    parent_id?: string | null;
                    last_edited_time?: number;
                    last_edited_by?: string | null;
                    is_deleted?: boolean;
                    deleted_at?: string | null;
                };
                Relationships: [];
            };
            meetings: {
                Row: {
                    id: string;
                    workspace_id: string;
                    title: string;
                    description: string | null;
                    start_time: string;
                    end_time: string;
                    status: MeetingStatus;
                    location: string | null;
                    join_url: string | null;
                    notes_block_id: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    workspace_id: string;
                    title: string;
                    description?: string | null;
                    start_time: string;
                    end_time: string;
                    status?: MeetingStatus;
                    location?: string | null;
                    join_url?: string | null;
                    notes_block_id?: string | null;
                    created_by?: string | null;
                };
                Update: {
                    title?: string;
                    description?: string | null;
                    start_time?: string;
                    end_time?: string;
                    status?: MeetingStatus;
                    location?: string | null;
                    join_url?: string | null;
                    notes_block_id?: string | null;
                };
                Relationships: [];
            };
            meeting_participants: {
                Row: {
                    id: string;
                    meeting_id: string;
                    user_id: string | null;
                    email: string;
                    name: string;
                    role: MeetingRole;
                    rsvp_status: RsvpStatus;
                };
                Insert: {
                    id?: string;
                    meeting_id: string;
                    user_id?: string | null;
                    email: string;
                    name: string;
                    role?: MeetingRole;
                    rsvp_status?: RsvpStatus;
                };
                Update: {
                    role?: MeetingRole;
                    rsvp_status?: RsvpStatus;
                    name?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            get_block_descendants: {
                Args: { root_id: string };
                Returns: { id: string }[];
            };
            get_workspace_blocks: {
                Args: { p_slug: string };
                Returns: Database['public']['Tables']['blocks']['Row'][];
            };
            is_workspace_member: {
                Args: { p_workspace_id: string };
                Returns: boolean;
            };
            get_workspace_role: {
                Args: { p_workspace_id: string };
                Returns: WorkspaceRole;
            };
            update_block_atomic: {
                Args: {
                    block_id: string;
                    patch: Record<string, unknown> | null;
                    content_val?: string[] | null;
                    parent_id_val?: string | null;
                    type_val?: string | null;
                    edit_time?: number | null;
                    editor_id?: string | null;
                };
                Returns: undefined;
            };
        };
        Enums: {
            workspace_role: WorkspaceRole;
            block_type: BlockType;
            account_role: AccountRole;
            meeting_status: MeetingStatus;
            meeting_role: MeetingRole;
            rsvp_status: RsvpStatus;
        };
        CompositeTypes: Record<string, never>;
    };
};
