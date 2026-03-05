/**
 * Seed admin, main user, and test accounts in Supabase.
 *
 * Requires:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - Migration 005_account_role applied (account_role on profiles)
 *
 * Run: npm run db:seed-accounts   or   node scripts/seed-accounts.mjs
 *
 * Creates:
 *   - admin@spore.local  / password: sporeAdmin1!
 *   - user@spore.local   / password: sporeUser1!   (your main account)
 *   - test@spore.local   / password: sporeTest1!
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local from project root (next to package.json)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local');
    process.exit(1);
}

// Accept both JWT (eyJ...) and new secret format (sb_secret_...). Reject obviously wrong values.
if (serviceRoleKey.length < 20) {
    console.error('SUPABASE_SERVICE_ROLE_KEY looks too short. Use the service_role or sb_secret_ key from Dashboard → API.');
    process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
    { email: 'admin@spore.local', password: 'sporeAdmin1!', fullName: 'spore Admin', accountRole: 'admin', slug: 'admin' },
    { email: 'user@spore.local', password: 'sporeUser1!', fullName: 'spore User', accountRole: 'user', slug: 'user' },
    { email: 'test@spore.local', password: 'sporeTest1!', fullName: 'spore Test', accountRole: 'test', slug: 'test' },
];

function slugFromEmail(email) {
    return email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'workspace';
}

async function ensureAccount({ email, password, fullName, accountRole, slug: preferredSlug }) {
    const slug = preferredSlug || slugFromEmail(email);

    const { data: existing } = await supabase.auth.admin.listUsers();
    const existingUser = existing?.users?.find((u) => u.email === email);

    let userId;
    if (existingUser) {
        userId = existingUser.id;
        console.log(`  User exists: ${email}`);
    } else {
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, account_role: accountRole },
        });
        if (createError) {
            console.error(`  Failed to create ${email}:`, createError.message);
            return;
        }
        userId = newUser.user.id;
        console.log(`  Created user: ${email} (${accountRole})`);
    }

    const { data: ws } = await supabase.from('workspaces').select('id').eq('owner_id', userId).limit(1).single();
    if (ws) {
        console.log(`  Workspace exists for ${email}`);
        return;
    }

    const workspaceId = uuidv4();
    const rootId = uuidv4();
    const now = Date.now();

    const { error: wsError } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name: `${fullName}'s Workspace`,
        slug,
        root_id: rootId,
        owner_id: userId,
    });
    if (wsError) {
        console.error(`  Workspace insert failed for ${email}:`, wsError.message);
        return;
    }

    const { error: memberError } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: 'owner',
    });
    if (memberError) {
        console.error(`  Member insert failed for ${email}:`, memberError.message);
        return;
    }

    const { error: blockError } = await supabase.from('blocks').insert({
        id: rootId,
        workspace_id: workspaceId,
        type: 'page',
        properties: { title: `${fullName}'s Workspace`, icon: 'Home' },
        content: [],
        parent_id: null,
        created_by: userId,
        last_edited_by: userId,
        created_time: now,
        last_edited_time: now,
    });
    if (blockError) {
        console.error(`  Block insert failed for ${email}:`, blockError.message);
        return;
    }

    const { error: profileError } = await supabase
        .from('profiles')
        .update({ account_role: accountRole })
        .eq('id', userId);
    if (profileError) {
        console.warn(`  Profile role update (may need 005 migration):`, profileError.message);
    }

    console.log(`  Workspace created: /${slug}`);
}

async function main() {
    console.log('Seeding accounts...\n');
    for (const account of accounts) {
        await ensureAccount(account);
    }
    console.log('\nDone. You can sign in with:');
    console.log('  Admin:  admin@spore.local  / sporeAdmin1!');
    console.log('  User:   user@spore.local  / sporeUser1!');
    console.log('  Test:   test@spore.local  / sporeTest1!');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
