#!/usr/bin/env node
/**
 * Run migration 010 (workspace_members RLS fix) against the linked Supabase DB.
 * Requires: SUPABASE_URL and SUPABASE_DB_PASSWORD in env (e.g. from .env.local).
 * Get DB password: Supabase Dashboard → Settings → Database → Database password.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
const DATABASE_URL = process.env.DATABASE_URL;

let connectionString;
if (DATABASE_URL) {
  connectionString = DATABASE_URL;
} else if (SUPABASE_URL && DB_PASSWORD) {
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = match ? match[1] : null;
  if (!projectRef) {
    console.error('Could not parse project ref from SUPABASE_URL:', SUPABASE_URL);
    process.exit(1);
  }
  connectionString = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`;
} else {
  console.error('Missing DB credentials. Set one of:');
  console.error('  DATABASE_URL=postgresql://...');
  console.error('  or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD');
  console.error('Get DB password: Supabase Dashboard → Settings → Database');
  process.exit(1);
}

const sqlPath = join(__dirname, '../supabase/migrations/010_workspace_members_insert_owner.sql');
const sql = readFileSync(sqlPath, 'utf8');

async function run() {
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString });
  try {
    await client.connect();
    await client.query(sql);
    console.log('Migration 010 applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
