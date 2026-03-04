-- ─── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────────────────────────
-- Extends auth.users. One row per authenticated user.
-- Created automatically on signup via trigger below.

CREATE TABLE public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    full_name   TEXT,
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workspaces ────────────────────────────────────────────────────────────────

CREATE TABLE public.workspaces (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL UNIQUE
               CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{0,62}[a-z0-9]$'),
    root_id    UUID NOT NULL,    -- ID of the root page block for this workspace
    owner_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workspace Roles & Members ─────────────────────────────────────────────────

CREATE TYPE public.workspace_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role         public.workspace_role NOT NULL DEFAULT 'editor',
    invited_by   UUID REFERENCES public.profiles(id),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ─── Block Types ───────────────────────────────────────────────────────────────
-- Mirrors the BlockType union in lib/types/block.ts exactly.

CREATE TYPE public.block_type AS ENUM (
    'page', 'text', 'h1', 'h2', 'h3',
    'bulleted_list_item', 'numbered_list_item',
    'to_do', 'toggle', 'quote', 'callout', 'code',
    'image', 'video', 'audio', 'file',
    'bookmark', 'embed', 'equation', 'divider'
);

-- ─── Blocks ────────────────────────────────────────────────────────────────────
-- The core table. Every piece of content is a block.
-- Schema mirrors IBlock from lib/types/block.ts exactly so the sync layer
-- can convert rows to IBlock with zero transformation.

CREATE TABLE public.blocks (
    id               UUID PRIMARY KEY,              -- client-generated via uuidv4()
    workspace_id     UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    type             public.block_type NOT NULL,
    properties       JSONB NOT NULL DEFAULT '{}',   -- BlockProperties (flexible per type)
    content          UUID[] NOT NULL DEFAULT '{}',  -- ordered array of child block IDs
    parent_id        UUID REFERENCES public.blocks(id) ON DELETE SET NULL,
    created_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_time     BIGINT NOT NULL,               -- unix ms (matches IBlock)
    last_edited_time BIGINT NOT NULL,               -- unix ms (matches IBlock)
    last_edited_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at       TIMESTAMPTZ
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────

-- Workspace-level queries (primary access pattern: fetch all blocks for workspace)
CREATE INDEX blocks_workspace_id_idx     ON public.blocks(workspace_id);
-- Parent lookup (for tree reconstruction and cascade deletes)
CREATE INDEX blocks_parent_id_idx        ON public.blocks(parent_id);
-- "Recently edited" sorting (home page, recents widget)
CREATE INDEX blocks_last_edited_time_idx ON public.blocks(last_edited_time DESC);
-- Active (non-deleted) blocks per workspace (partial index — most efficient)
CREATE INDEX blocks_active_idx           ON public.blocks(workspace_id) WHERE is_deleted = FALSE;
-- GIN index on JSONB properties for future full-text search / filter queries
CREATE INDEX blocks_properties_gin_idx   ON public.blocks USING GIN (properties);

-- ─── Triggers ──────────────────────────────────────────────────────────────────

-- Auto-create a profile row whenever a new user registers via Supabase Auth
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

-- Auto-update updated_at on any row change
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

-- ─── Storage ───────────────────────────────────────────────────────────────────
-- Create the block-assets bucket via Supabase dashboard or:
--   INSERT INTO storage.buckets (id, name, public) VALUES ('block-assets', 'block-assets', false);
-- Path structure: {workspace_id}/{block_id}/{filename}
-- RLS for storage is defined in 002_rls.sql
