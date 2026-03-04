# Spore – Supabase setup

## Credentials (already in `.env.local`)

- **Project URL:** `https://gfwdqbezpwtffvphriut.supabase.co`
- **Anon key:** Set in `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service role key:** Get from [Dashboard → Settings → API](https://supabase.com/dashboard/project/gfwdqbezpwtffvphriut/settings/api) and set as `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## One-time database setup

**Option A – SQL Editor (no token)**  
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/gfwdqbezpwtffvphriut/sql/new).  
2. Copy the contents of **`supabase/seed.sql`** and run it.

**Option B – Management API (with PAT)**  
1. Create a [Personal Access Token](https://supabase.com/dashboard/account/tokens) with **database_write**.  
2. Run: `SUPABASE_ACCESS_TOKEN=your_pat npm run db:seed`

**Option C – CLI**  
1. Run `npx supabase login`, then `npx supabase link --project-ref gfwdqbezpwtffvphriut` (use your DB password when prompted).  
2. Run `npm run db:push`.

After any option, enable **Realtime** for the **`blocks`** table:  
[Database → Replication](https://supabase.com/dashboard/project/gfwdqbezpwtffvphriut/database/replication) → enable **blocks**.

## What gets created

| Item | Purpose |
|------|--------|
| **profiles** | One row per user (created by trigger on signup). |
| **workspaces** | One per user on signup; identified by `slug` in the URL. |
| **workspace_members** | Membership + role (owner / editor / viewer). |
| **blocks** | All doc content (pages, text, lists, etc.); tree via `parent_id` and `content` (child IDs). |
| **block-assets** bucket | File uploads for blocks; path `{workspace_id}/{block_id}/{filename}`. |
| **RLS** | Access only to workspaces you’re a member of; storage scoped by workspace. |
| **Functions** | `get_block_descendants`, `get_workspace_blocks`, `is_workspace_member`, `get_workspace_role`. |

## Auth callback URL

OAuth redirect is set to `NEXT_PUBLIC_SITE_URL/auth/callback`. Ensure your app serves that path (e.g. `http://localhost:3000/auth/callback` in dev). In Supabase Dashboard → Authentication → URL Configuration, add the same URL under “Redirect URLs”.
