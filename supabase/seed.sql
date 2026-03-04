-- ─────────────────────────────────────────────────────────────────────────────
-- Spore – Full database setup for Supabase
-- Run this once in: Supabase Dashboard → SQL Editor → New query
-- Project URL: https://gfwdqbezpwtffvphriut.supabase.co
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Extensions ────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 2. Profiles ──────────────────────────────────────────────────────────────
-- One row per auth user. Created by trigger on signup.

CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Workspaces ────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE
               CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$'),
    root_id    UUID NOT NULL,
    owner_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. Workspace roles & members ─────────────────────────────────────────────

CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role         public.workspace_role NOT NULL DEFAULT 'editor',
    invited_by   UUID REFERENCES public.profiles(id),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ─── 5. Block types & blocks ──────────────────────────────────────────────────

CREATE TYPE public.block_type AS ENUM (
    'page', 'text', 'h1', 'h2', 'h3',
    'bulleted_list_item', 'numbered_list_item',
    'to_do', 'toggle', 'quote', 'callout', 'code',
    'image', 'video', 'audio', 'file',
    'bookmark', 'embed', 'equation', 'divider'
);

CREATE TABLE public.blocks (
    id               UUID PRIMARY KEY,
    workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type             public.block_type NOT NULL,
    properties       JSONB NOT NULL DEFAULT '{}',
    content          UUID[] NOT NULL DEFAULT '{}',
    parent_id        UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_time     BIGINT NOT NULL,
    last_edited_time BIGINT NOT NULL,
    last_edited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ
);

-- Indexes
CREATE INDEX blocks_workspace_id_idx     ON public.blocks(workspace_id);
CREATE INDEX blocks_parent_id_idx        ON public.blocks(parent_id);
CREATE INDEX blocks_last_edited_time_idx ON public.blocks(last_edited_time DESC);
CREATE INDEX blocks_active_idx           ON public.blocks(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX blocks_properties_gin_idx   ON public.blocks USING GIN (properties);

-- ─── 6. Triggers ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ─── 7. Storage bucket (for block file uploads) ────────────────────────────────
-- Path structure: {workspace_id}/{block_id}/{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('block-assets', 'block-assets', false)
ON CONFLICT (id) DO NOTHING;

-- ─── 8. Row Level Security ────────────────────────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks            ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.workspace_members
        WHERE workspace_id = p_workspace_id
          AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_role(p_workspace_id UUID)
RETURNS public.workspace_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT role
    FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
    LIMIT 1;
$$;

-- Profiles
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles_select_coworkers"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.workspace_members wm1
            JOIN public.workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
            WHERE wm1.user_id = auth.uid()
              AND wm2.user_id = profiles.id
        )
    );

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Workspaces
CREATE POLICY "workspaces_select_members"
    ON public.workspaces FOR SELECT
    USING (public.is_workspace_member(id));

CREATE POLICY "workspaces_insert_authenticated"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "workspaces_update_owner"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_owner"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- Workspace members
CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        public.get_workspace_role(workspace_id) IN ('owner', 'editor')
    );

CREATE POLICY "workspace_members_update"
    ON public.workspace_members FOR UPDATE
    USING (
        public.get_workspace_role(workspace_id) = 'owner'
        OR user_id = auth.uid()
    );

CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE
    USING (
        public.get_workspace_role(workspace_id) = 'owner'
        OR user_id = auth.uid()
    );

-- Blocks
CREATE POLICY "blocks_select_members"
    ON public.blocks FOR SELECT
    USING (
        public.is_workspace_member(workspace_id)
        AND is_deleted = FALSE
    );

CREATE POLICY "blocks_insert_members"
    ON public.blocks FOR INSERT
    WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "blocks_update_members"
    ON public.blocks FOR UPDATE
    USING (public.is_workspace_member(workspace_id));

CREATE POLICY "blocks_delete_editors"
    ON public.blocks FOR DELETE
    USING (
        public.get_workspace_role(workspace_id) IN ('owner', 'editor')
    );

-- Storage (block-assets by workspace_id in path)
CREATE POLICY "storage_workspace_access"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'block-assets'
        AND public.is_workspace_member(
            (storage.foldername(name))[1]::UUID
        )
    );

-- ─── 9. Functions ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_block_descendants(root_id UUID)
RETURNS TABLE(id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    WITH RECURSIVE descendants AS (
        SELECT b.id
        FROM public.blocks b
        WHERE b.parent_id = root_id
          AND NOT b.is_deleted
        UNION ALL
        SELECT b.id
        FROM public.blocks b
        JOIN descendants d ON b.parent_id = d.id
        WHERE NOT b.is_deleted
    )
    SELECT id FROM descendants;
$$;

CREATE OR REPLACE FUNCTION public.get_workspace_blocks(p_slug TEXT)
RETURNS SETOF public.blocks
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT b.*
    FROM public.blocks b
    JOIN public.workspaces w ON b.workspace_id = w.id
    WHERE w.slug = p_slug
      AND NOT b.is_deleted
      AND public.is_workspace_member(b.workspace_id);
$$;

-- ─── Done ─────────────────────────────────────────────────────────────────────
-- Enable Realtime for blocks (optional, for live sync):
--   Dashboard → Database → Replication → Enable for table "blocks"
