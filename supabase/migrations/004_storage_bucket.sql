-- Create the block-assets bucket for block file uploads.
-- Path structure: {workspace_id}/{block_id}/{filename}
-- RLS for this bucket is in 002_rls.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('block-assets', 'block-assets', false)
ON CONFLICT (id) DO NOTHING;
