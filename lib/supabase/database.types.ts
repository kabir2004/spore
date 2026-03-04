/**
 * Hand-written database types that mirror the Supabase schema.
 * Replace with auto-generated types once you have a Supabase project:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 */

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export type AccountRole = 'admin' | 'user' | 'test';

export type BlockType =
    | 'page' | 'text' | 'h1' | 'h2' | 'h3'
    | 'bulleted_list_item' | 'numbered_list_item'
    | 'to_do' | 'toggle' | 'quote' | 'callout' | 'code'
    | 'image' | 'video' | 'audio' | 'file'
    | 'bookmark' | 'embed' | 'equation' | 'divider';

export interface Database {
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
            };
        };
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
        };
        Enums: {
            workspace_role: WorkspaceRole;
            block_type: BlockType;
            account_role: AccountRole;
        };
    };
}
