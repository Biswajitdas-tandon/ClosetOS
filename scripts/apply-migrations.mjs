import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const password = process.env.PGPASSWORD;
const host = process.env.PGHOST;
if (!password || !host) {
  console.error('PGPASSWORD and PGHOST env vars required');
  process.exit(1);
}

const files = [
  'supabase/migrations/0001_init.sql',
  'supabase/migrations/0002_match_items_rpc.sql',
];

const client = new Client({
  host,
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('connected');

for (const f of files) {
  const sql = await readFile(resolve(ROOT, f), 'utf8');
  console.log(`\n→ applying ${f} (${sql.length} chars)…`);
  try {
    await client.query(sql);
    console.log(`  ✓ ok`);
  } catch (e) {
    console.error(`  ✗ failed:`, e.message);
    await client.end();
    process.exit(1);
  }
}

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by 1",
);
console.log('\npublic tables:');
for (const r of rows) console.log('  -', r.table_name);

await client.end();
console.log('\ndone.');
