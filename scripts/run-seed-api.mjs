#!/usr/bin/env node
/**
 * Run supabase/seed.sql against the project via Supabase Management API.
 * Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens)
 * Token must have database_write scope.
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'gfwdqbezpwtffvphriut';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN. Get a PAT from https://supabase.com/dashboard/account/tokens (needs database_write).');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
const query = fs.readFileSync(sqlPath, 'utf8');

const body = JSON.stringify({ query, read_only: false });

const req = https.request(
  {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/query`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log('Database setup completed successfully.');
        if (data) try { console.log(JSON.parse(data)); } catch (_) {}
      } else {
        console.error('Request failed:', res.statusCode, data || res.statusMessage);
        process.exit(1);
      }
    });
  }
);

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.write(body);
req.end();
