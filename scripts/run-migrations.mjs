// Runs SQL files against the Supabase Postgres directly.
// Usage:
//   DB_PASSWORD='xxx' node scripts/run-migrations.mjs <file1.sql> [file2.sql ...]
// Or:
//   DATABASE_URL='postgresql://...' node scripts/run-migrations.mjs ...
//
// Defaults to direct connection on db.vfrirdbogwzfvpsflqse.supabase.co.

import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const PROJECT_REF = 'vfrirdbogwzfvpsflqse'
const files = process.argv.slice(2)

if (files.length === 0) {
  console.error('Usage: node scripts/run-migrations.mjs <file.sql> [...]')
  process.exit(1)
}

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : (() => {
      const password = process.env.DB_PASSWORD
      if (!password) {
        console.error('Set DB_PASSWORD or DATABASE_URL.')
        process.exit(1)
      }
      return {
        host: `db.${PROJECT_REF}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password,
        ssl: { rejectUnauthorized: false },
      }
    })()

const client = new Client(config)

async function run() {
  console.log(`Connecting to ${config.host ?? 'DATABASE_URL'}…`)
  await client.connect()
  console.log('Connected.')

  for (const path of files) {
    const sql = readFileSync(path, 'utf8')
    if (sql.trim().length === 0) {
      console.log(`(skipping empty file: ${path})`)
      continue
    }
    console.log(`\n→ Running ${path} (${sql.length} bytes)…`)
    try {
      await client.query(sql)
      console.log(`✓ ${path} applied`)
    } catch (err) {
      console.error(`✗ ${path} failed:`)
      console.error(err)
      process.exit(1)
    }
  }

  console.log('\nVerification:')
  const checks = await client.query(`
    select 'campgrounds' as t, count(*)::int as n from public.campgrounds
    union all
    select 'campground_qr_tokens', count(*)::int from public.campground_qr_tokens
    union all
    select 'rpcs (preview + checkin)', count(*)::int from pg_proc
      where proname in ('preview_campground_by_token', 'checkin_by_token')
    union all
    select 'interests', count(*)::int from public.interests
    union all
    select 'tables_with_rls', count(*)::int from pg_tables
      where schemaname = 'public' and rowsecurity = true
    order by t
  `)
  console.table(checks.rows)

  await client.end()
  console.log('\nDone.')
}

run().catch((err) => {
  console.error('Fatal:', err.message ?? err)
  process.exit(1)
})
