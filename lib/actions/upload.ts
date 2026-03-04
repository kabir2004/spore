'use server';

import { createClient } from '@/lib/supabase/server';

const BUCKET = 'block-assets';

/**
 * Upload a file attached to a block (image, video, audio, generic file).
 * Returns the public URL for the uploaded file.
 *
 * Path structure: {workspaceId}/{blockId}/{timestamp}.{ext}
 * This structure allows the Storage RLS policy to check workspace membership
 * by extracting the first path segment as the workspace_id.
 */
export async function uploadBlockFile(
    file: File,
    workspaceId: string,
    blockId: string
): Promise<{ url: string }> {
    const supabase = await createClient();

    const ext = file.name.split('.').pop() ?? 'bin';
    const path = `${workspaceId}/${blockId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false,
        });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl };
}

/**
 * Delete a file from storage when its block is deleted.
 * path should be the same path string used when uploading.
 */
export async function deleteBlockFile(path: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw new Error(`Delete file failed: ${error.message}`);
}
