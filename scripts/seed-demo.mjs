/**
 * Seed a polished demo workspace using the existing user@spore.local account.
 * No service role key required — signs in with the anon key + password.
 *
 * Persona: "Jordan Blake" at "Meridian"
 * Run: npm run db:seed-demo
 */

import { v4 as uuidv4 } from 'uuid';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
    const env = readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
}

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const LOGIN_EMAIL    = 'user@spore.local';
const LOGIN_PASSWORD = 'sporeUser1!';
const PERSONA_NAME   = 'Jordan Blake';
const WORKSPACE_NAME = 'Meridian';

// ── Raw REST helpers ──────────────────────────────────────────────────────────

function hdrs(jwt, extra = {}) {
    return { apikey: SUPABASE_ANON, Authorization: `Bearer ${jwt}`,
             'Content-Type': 'application/json', ...extra };
}

async function restGet(jwt, table, qs = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`,
        { headers: hdrs(jwt, { Prefer: 'return=representation' }) });
    if (!r.ok) throw new Error(`GET ${table}: ${r.status} ${await r.text()}`);
    return r.json();
}

async function restPatch(jwt, table, qs, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`,
        { method: 'PATCH', headers: hdrs(jwt), body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`PATCH ${table}: ${r.status} ${await r.text()}`);
}

async function restPost(jwt, table, rows) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`,
        { method: 'POST', headers: hdrs(jwt, { Prefer: 'return=minimal' }),
          body: JSON.stringify(rows) });
    if (!r.ok) throw new Error(`POST ${table}: ${r.status} ${await r.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`🌱 Seeding demo workspace as ${LOGIN_EMAIL}...\n`);

    // 1. Sign in
    const signInRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    });
    if (!signInRes.ok) {
        console.error('  ✗ Sign-in failed:', await signInRes.text());
        console.error('    Run: npm run db:seed-accounts first.');
        process.exit(1);
    }
    const { access_token: jwt, user } = await signInRes.json();
    const userId = user.id;
    console.log(`  ✓ Signed in (${userId.slice(0, 8)}…)`);

    // 2. Find workspace
    const wsRows = await restGet(jwt, 'workspaces',
        `?owner_id=eq.${userId}&select=id,slug,root_id&limit=1`);
    if (!wsRows?.length) {
        console.error('  ✗ No workspace found. Run: npm run db:seed-accounts first.');
        process.exit(1);
    }
    const { id: WORKSPACE_ID, slug, root_id: ROOT_ID } = wsRows[0];
    console.log(`  ✓ Found workspace: /${slug}`);

    // 3. Rename workspace + root block
    await restPatch(jwt, 'workspaces', `?id=eq.${WORKSPACE_ID}`, { name: WORKSPACE_NAME });
    await restPatch(jwt, 'blocks', `?id=eq.${ROOT_ID}`,
        { properties: { title: WORKSPACE_NAME, icon: 'Home' } });
    console.log(`  ✓ Renamed to "${WORKSPACE_NAME}"`);

    // 4. Clear existing child blocks
    const old = await restGet(jwt, 'blocks',
        `?workspace_id=eq.${WORKSPACE_ID}&id=neq.${ROOT_ID}&is_deleted=eq.false&select=id`);
    if (old?.length) {
        await restPatch(jwt, 'blocks', `?id=in.(${old.map(b => b.id).join(',')})`,
            { is_deleted: true, deleted_at: new Date().toISOString() });
        console.log(`  ✓ Cleared ${old.length} old block(s)`);
    }

    // ── Block factory (ALL IDs and context available here) ───────────────────

    const NOW = Date.now();
    const DAY = 86400000;

    const ROADMAP_ID  = uuidv4();
    const HANDBOOK_ID = uuidv4();
    const SYNC_ID     = uuidv4();
    const DESIGN_ID   = uuidv4();
    const OKR_ID      = uuidv4();
    const ENG_ID      = uuidv4();

    function blk(id, type, props, content, parentId, daysAgo = 0) {
        const t = NOW - daysAgo * DAY;
        return { id, workspace_id: WORKSPACE_ID, type, properties: props,
                 content, parent_id: parentId,
                 created_by: userId, last_edited_by: userId,
                 created_time: t, last_edited_time: t };
    }

    const pg  = (id, title, icon, kids, pid, d = 0) =>
        blk(id, 'page', { title, icon }, kids, pid, d);
    const h2  = (t, pid)         => blk(uuidv4(), 'h2',                 { text: t },                       [], pid);
    const h3  = (t, pid)         => blk(uuidv4(), 'h3',                 { text: t },                       [], pid);
    const txt = (t, pid)         => blk(uuidv4(), 'text',               { text: t },                       [], pid);
    const bul = (t, pid)         => blk(uuidv4(), 'bulleted_list_item', { text: t },                       [], pid);
    const num = (t, pid)         => blk(uuidv4(), 'numbered_list_item', { text: t },                       [], pid);
    const td  = (t, c, pid)      => blk(uuidv4(), 'to_do',             { text: t, checked: c },            [], pid);
    const co  = (t, i, col, pid) => blk(uuidv4(), 'callout', { text: t, calloutIcon: i, calloutColor: col }, [], pid);
    const qt  = (t, pid)         => blk(uuidv4(), 'quote',             { text: t },                       [], pid);
    const div = (pid)            => blk(uuidv4(), 'divider',            {},                                [], pid);
    const cod = (lang, src, pid) => blk(uuidv4(), 'code',              { language: lang, code: src },      [], pid);

    function section(items) {
        return { items, ids: items.map(b => b.id) };
    }

    // ── Page content ──────────────────────────────────────────────────────────

    const roadmap = section([
        co('🎯 On track for Q2 launch. Three features in final review.', '🎯', 'green', ROADMAP_ID),
        div(ROADMAP_ID),
        h2('Q2 2025 — In Progress', ROADMAP_ID),
        td('User authentication + SSO (Google, Microsoft)',    true,  ROADMAP_ID),
        td('Real-time multiplayer cursors',                    true,  ROADMAP_ID),
        td('Block drag-and-drop reordering',                   true,  ROADMAP_ID),
        td('AI writing assistant (inline)',                    false, ROADMAP_ID),
        td('Mobile app — iOS (beta)',                          false, ROADMAP_ID),
        td('API v2 + webhook events',                          false, ROADMAP_ID),
        div(ROADMAP_ID),
        h2('Q3 2025 — Planned', ROADMAP_ID),
        bul('Advanced analytics & usage dashboard',            ROADMAP_ID),
        bul('Granular team permissions & link sharing',        ROADMAP_ID),
        bul('Zapier, Slack, and Notion import integrations',   ROADMAP_ID),
        bul('Offline mode with conflict-free sync (CRDT)',     ROADMAP_ID),
        div(ROADMAP_ID),
        h2('Icebox', ROADMAP_ID),
        bul('Public page publishing',                          ROADMAP_ID),
        bul('Embedded databases (Notion-style)',               ROADMAP_ID),
        bul('White-label / custom domain support',             ROADMAP_ID),
        txt('Icebox items are unscoped. Revisit during Q2 planning if capacity allows.', ROADMAP_ID),
    ]);

    const handbook = section([
        co('Single source of truth for how Meridian operates. Keep it honest, keep it updated. 🤝', '📖', 'blue', HANDBOOK_ID),
        div(HANDBOOK_ID),
        h2('Our Values', HANDBOOK_ID),
        bul('Default to transparency — share context early and often',         HANDBOOK_ID),
        bul('Ship small, learn fast — prefer weekly releases over big bangs',  HANDBOOK_ID),
        bul('Respect async — decisions in writing, not buried in Slack',       HANDBOOK_ID),
        bul('Disagree and commit — debate vigorously, align completely',       HANDBOOK_ID),
        bul('Owned outcomes — every initiative has a single DRI',              HANDBOOK_ID),
        div(HANDBOOK_ID),
        h2('Engineering Process', HANDBOOK_ID),
        num('Open a GitHub issue with full context and acceptance criteria',   HANDBOOK_ID),
        num('Discuss approach async; spike PoC if needed',                    HANDBOOK_ID),
        num('PR review — minimum 1 approval, CI green',                       HANDBOOK_ID),
        num('Deploy to staging, QA smoke test',                               HANDBOOK_ID),
        num('Merge to main and monitor dashboards for 30 min',                HANDBOOK_ID),
        div(HANDBOOK_ID),
        h2('Meetings', HANDBOOK_ID),
        txt('Three recurring meetings: Weekly Sync (Mon 10am PST), Design Review (Wed 2pm PST), All-Hands (bi-weekly Fri 11am PST). All others should be async.', HANDBOOK_ID),
        div(HANDBOOK_ID),
        h2('Tools We Use', HANDBOOK_ID),
        bul('Meridian — notes, wikis, project tracking (you are here)',  HANDBOOK_ID),
        bul('GitHub — code, issues, PRs',                                HANDBOOK_ID),
        bul('Figma — design specs and prototypes',                       HANDBOOK_ID),
        bul('Linear — bug tracking and sprint management',               HANDBOOK_ID),
        bul('Slack — real-time communication (responses ≤ 24 h)',        HANDBOOK_ID),
    ]);

    const sync = section([
        txt('📅 Monday, March 4, 2025 · 10:00–10:45 AM PST', SYNC_ID),
        txt('Attendees: Jordan Blake · Marcus Webb · Priya Nair · Jake Sullivan · Lena Park', SYNC_ID),
        div(SYNC_ID),
        h2('Agenda', SYNC_ID),
        td('Q1 retrospective walkthrough',      true,  SYNC_ID),
        td('Q2 roadmap sign-off',               true,  SYNC_ID),
        td('Design system — tokens v2 review',  false, SYNC_ID),
        td('Hiring pipeline update',            false, SYNC_ID),
        div(SYNC_ID),
        h2('Notes', SYNC_ID),
        txt('Q1 retro: strong execution on auth and real-time. Missed mobile milestone due to third-party SDK delays — moving to Q2. Team morale high.', SYNC_ID),
        txt('Q2 roadmap approved. AI assistant moved to stretch goal. Marcus to reduce API v2 scope to core endpoints only.', SYNC_ID),
        div(SYNC_ID),
        h2('Action Items', SYNC_ID),
        td('Marcus — finish auth migration by EOW, update Linear',                     false, SYNC_ID),
        td('Priya — share updated Figma token spec in #design by Wednesday',           false, SYNC_ID),
        td('Jake — schedule 3 senior engineer interviews before March 12',             false, SYNC_ID),
        td('Lena — post Q1 retro doc to Team Handbook by Tuesday',                     true,  SYNC_ID),
        td('Jordan — send investor update email with Q2 roadmap attached',             false, SYNC_ID),
        div(SYNC_ID),
        qt('"Execution is the only currency that matters." — Marcus, probably.', SYNC_ID),
    ]);

    const design = section([
        co('Single source of truth for all UI decisions. Reference this before reaching for one-offs. ✨', '✨', 'purple', DESIGN_ID),
        div(DESIGN_ID),
        h2('Typography', DESIGN_ID),
        bul('Display / Body: Arimo (sans-serif)',       DESIGN_ID),
        bul('Monospace / Code: JetBrains Mono',        DESIGN_ID),
        bul('Base size: 15px · Line height: 1.65',     DESIGN_ID),
        bul('Headings: 24px / 20px / 16px (H1/H2/H3)', DESIGN_ID),
        div(DESIGN_ID),
        h2('Colour Palette', DESIGN_ID),
        cod('css',
`/* Backgrounds */
--bg-primary:    #FFFFFF;
--bg-secondary:  #F7F7F5;
--bg-hover:      #F1F1EF;

/* Text */
--text-primary:  #1A1A1A;
--text-secondary:#6B6B6B;

/* Accents */
--accent-blue:   #2383E2;
--accent-green:  #0F7B6C;
--accent-red:    #E03E3E;
--accent-purple: #6940A5;`, DESIGN_ID),
        div(DESIGN_ID),
        h2('Component Library', DESIGN_ID),
        bul('Buttons — Primary, Secondary, Ghost, Danger',  DESIGN_ID),
        bul('Inputs — Text, Select, Checkbox, Toggle',      DESIGN_ID),
        bul('Modals — Dialog, Drawer, Popover',             DESIGN_ID),
        bul('Navigation — Sidebar, TopBar, Breadcrumb',     DESIGN_ID),
        bul('Blocks — all 20 block types rendered',         DESIGN_ID),
        div(DESIGN_ID),
        h2('Spacing Scale', DESIGN_ID),
        txt('4px base unit. Common values: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Avoid arbitrary values.', DESIGN_ID),
    ]);

    const okr = section([
        txt('Period: April 1 – June 30, 2025 · Owner: Jordan Blake · Status: 🟡 In Progress', OKR_ID),
        div(OKR_ID),
        h2('O1 — Reach 500 active users', OKR_ID),
        td('Closed beta → public launch (April 15)',                           false, OKR_ID),
        td('Redesign onboarding flow to < 3-step activation',                  true,  OKR_ID),
        td('Launch referral programme with in-app invite link',                false, OKR_ID),
        td('Publish 4 SEO landing pages for high-intent keywords',             false, OKR_ID),
        div(OKR_ID),
        h2('O2 — 99.5% uptime SLA', OKR_ID),
        td('Configure PagerDuty + Slack alerting for p95 latency',             true,  OKR_ID),
        td('Load test at 10k concurrent connections in staging',               false, OKR_ID),
        td('DB failover drill — automated failover < 30s',                    false, OKR_ID),
        td('Incident post-mortem template in Team Handbook',                   true,  OKR_ID),
        div(OKR_ID),
        h2('O3 — NPS > 60', OKR_ID),
        td('Ship in-app feedback widget (end of May)',                         false, OKR_ID),
        td('Weekly customer success check-ins with top-10 accounts',           true,  OKR_ID),
        td('Analyse top 5 churn reasons from Q1 exit surveys',                true,  OKR_ID),
        td('Publish public changelog and release notes page',                  false, OKR_ID),
    ]);

    const eng = section([
        co('Architecture decisions live here. Write an ADR for anything that changes the data model or public API. 🏗️', '🏗️', 'orange', ENG_ID),
        div(ENG_ID),
        h2('Tech Stack', ENG_ID),
        bul('Frontend: Next.js 15 + React 19, TypeScript 5, Tailwind CSS 4',  ENG_ID),
        bul('State: Zustand 5 (localStorage persist, skipHydration)',          ENG_ID),
        bul('Database: Supabase (PostgreSQL 15, RLS, Realtime)',               ENG_ID),
        bul('Auth: Supabase Auth (email/password, Google OAuth, Azure OAuth)', ENG_ID),
        bul('Deployment: Vercel (Edge middleware, ISR)',                       ENG_ID),
        div(ENG_ID),
        h2('Architecture Decisions', ENG_ID),
        h3('ADR-001 · Block-based content model', ENG_ID),
        txt('All content is stored as flat blocks with a parent_id reference. Pages are blocks of type "page". Enables infinite nesting, easy reordering, and granular Realtime subscriptions per block.', ENG_ID),
        h3('ADR-002 · Client-generated UUIDs', ENG_ID),
        txt('Block IDs are generated client-side (uuidv4) before the server insert. Enables optimistic UI updates with zero round-trips and makes offline support straightforward.', ENG_ID),
        h3('ADR-003 · Atomic property merge via RPC', ENG_ID),
        txt('Block property updates use a Postgres RPC that merges JSONB in a single round-trip, eliminating SELECT + UPDATE and preventing lost concurrent updates.', ENG_ID),
        div(ENG_ID),
        h2('Performance Targets', ENG_ID),
        bul('Time to Interactive: < 1.5s on 4G mobile',            ENG_ID),
        bul('Keystroke → store update latency: < 16ms (60fps)',     ENG_ID),
        bul('Supabase Realtime delivery: < 200ms p99',              ENG_ID),
        bul('Block render depth: O(1) — no full-tree re-renders',   ENG_ID),
    ]);

    // 5. Update root content
    await restPatch(jwt, 'blocks', `?id=eq.${ROOT_ID}`,
        { content: [ROADMAP_ID, HANDBOOK_ID, SYNC_ID, DESIGN_ID, OKR_ID, ENG_ID] });

    // 6. Assemble + insert all blocks
    const subPages = [
        pg(ROADMAP_ID,  'Product Roadmap',     'Rocket',       roadmap.ids,  ROOT_ID, 2),
        pg(HANDBOOK_ID, 'Team Handbook',       'BookOpen',     handbook.ids, ROOT_ID, 5),
        pg(SYNC_ID,     'Weekly Sync · Mar 4', 'CalendarDays', sync.ids,     ROOT_ID, 0),
        pg(DESIGN_ID,   'Design System',       'Palette',      design.ids,   ROOT_ID, 7),
        pg(OKR_ID,      'OKRs · Q2 2025',      'Target',       okr.ids,      ROOT_ID, 3),
        pg(ENG_ID,      'Engineering Docs',    'Code2',        eng.ids,      ROOT_ID, 4),
    ];

    const allBlocks = [
        ...subPages,
        ...roadmap.items, ...handbook.items, ...sync.items,
        ...design.items,  ...okr.items,      ...eng.items,
    ];

    const CHUNK = 50;
    for (let i = 0; i < allBlocks.length; i += CHUNK) {
        await restPost(jwt, 'blocks', allBlocks.slice(i, i + CHUNK));
    }
    console.log(`  ✓ Inserted ${allBlocks.length} blocks across 6 pages`);

    console.log('\n✅  Demo workspace ready!\n');
    console.log(`  URL:      /${slug}`);
    console.log(`  Email:    ${LOGIN_EMAIL}`);
    console.log(`  Password: ${LOGIN_PASSWORD}`);
    console.log(`  Name:     ${PERSONA_NAME}\n`);
    console.log('  Pages in sidebar:');
    console.log('    🏠  Meridian HQ');
    console.log('    🚀  Product Roadmap');
    console.log('    📖  Team Handbook');
    console.log('    📅  Weekly Sync · Mar 4');
    console.log('    🎨  Design System');
    console.log('    🎯  OKRs · Q2 2025');
    console.log('    💻  Engineering Docs');
}

main().catch(e => { console.error(e); process.exit(1); });
