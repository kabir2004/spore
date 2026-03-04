# Seed accounts (admin, user, test)

Creates three accounts you can use to sign in:

| Account | Email              | Password       | Role  |
|---------|--------------------|----------------|-------|
| Admin   | admin@aurora.local | AuroraAdmin1!  | admin |
| User    | user@aurora.local   | AuroraUser1!   | user  |
| Test    | test@aurora.local   | AuroraTest1!   | test  |

## 1. Add `account_role` to the database (one time)

In **Supabase Dashboard → SQL Editor**, run the contents of:

**`supabase/migrations/005_account_role.sql`**

This adds the `account_role` column to `profiles` and the trigger so new users get a role.

## 2. Set your service role key

In **Supabase Dashboard → Project Settings → API**, copy the **service_role** key (secret).

Put it in `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-actual-service-role-key...
```

Do not commit this key or expose it in the browser. It bypasses RLS.

## 3. Run the seed script

From the project root:

```bash
npm run db:seed-accounts
```

Or:

```bash
node --env-file=.env.local scripts/seed-accounts.mjs
```

The script creates the three auth users (if they don’t exist), their profiles, and a workspace for each. You can then sign in at `/login` with any of the emails above.

## Using `account_role` in the app

Profiles now have `account_role`: `'admin' | 'user' | 'test'`. You can use it for:

- Feature flags or UI (e.g. show admin tools only when `profile.account_role === 'admin'`)
- Test accounts (e.g. `account_role === 'test'` for QA or demos)

Fetch the current user’s profile (including `account_role`) from the `profiles` table where `id = auth.uid()`.
