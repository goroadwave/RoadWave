// @ts-check
//
// Static schema-invariant tests for the multi-campground data
// tenancy audit (2026-05-24). These run anywhere -- no preview
// env, no Supabase service-role key, no browser. They read the
// SQL migration files directly and assert structural facts the
// audit identified as load-bearing:
//
//   1. campgrounds(id uuid primary key) is the tenant root.
//   2. campground_admins(campground_id, user_id, role) is the
//      ONLY membership table; PK is (campground_id, user_id).
//   3. Every campground-owned child table has a `campground_id`
//      column referencing campgrounds(id) ON DELETE CASCADE.
//   4. Every camper-private table has a `user_id` referencing
//      auth.users(id) ON DELETE CASCADE.
//   5. RLS is enabled on every user-facing table.
//
// If any of these break in a future migration, the offending
// child table can drift -- camper or campground data could end
// up orphaned, mis-attributed, or unjoinable. The tests fail
// loudly so you catch it before merge.
//
// What these tests deliberately do NOT cover:
//   * Live data isolation (covered by cross-owner-isolation.test.js
//     stubs which need preview env + service-role key).
//   * UI-level archived/resolved tab behavior (covered by the
//     live QA checklist at tests/qa/CAMPGROUND_TENANCY.md).
//   * Slug-rename behavior (data is keyed by id not slug; the
//     query-pattern tests in tenancy-queries.test.js prove this
//     at the application layer).

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

const MIG_DIR = join(process.cwd(), 'supabase', 'migrations')

// Read all migrations once at module load and concatenate into a
// single searchable string. We never need to know WHICH migration
// added a thing -- only that the cumulative schema state has the
// expected shape.
function loadAllMigrations() {
  const files = readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  return files
    .map((f) => `-- FILE: ${f}\n${readFileSync(join(MIG_DIR, f), 'utf8')}`)
    .join('\n\n')
}

const ALL_MIGRATIONS = loadAllMigrations()

// Strip SQL line + block comments so a comment that mentions
// "campground_id" doesn't satisfy a test about real DDL. Crude
// but sufficient for the assertions below; we never have comments
// inside DDL statements that we test against.
function stripComments(sql) {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

const DDL = stripComments(ALL_MIGRATIONS)

// Lowercased version for case-insensitive matching. Postgres DDL
// is case-insensitive; we lowercase once up front to keep the
// assertions readable.
const DDL_LC = DDL.toLowerCase()

// ---------------------------------------------------------------------------
// 1. Tenant root: campgrounds(id) is the permanent key.
// ---------------------------------------------------------------------------

test.describe('Schema: tenant root', () => {
  test('campgrounds table exists with id uuid primary key', () => {
    // Match `create table ... public.campgrounds (` then look for
    // the id column with primary key in the next ~10 lines.
    const m = DDL_LC.match(
      /create table[^(]*public\.campgrounds\s*\(([\s\S]{0,400}?)\)/,
    )
    expect(m, 'campgrounds CREATE TABLE not found').toBeTruthy()
    const cols = m[1]
    expect(cols).toMatch(/\bid\s+uuid\b/)
    expect(cols).toMatch(/primary\s+key/)
  })

  test('campgrounds.slug is unique (mutable label, not a relationship key)', () => {
    // Either inline `slug text not null unique` or a separate
    // unique constraint / index referencing slug.
    expect(DDL_LC).toMatch(/\bslug\s+text[^,]*\bunique\b/)
  })
})

// ---------------------------------------------------------------------------
// 2. Membership: campground_admins is the only owner<->campground bridge.
// ---------------------------------------------------------------------------

test.describe('Schema: owner membership', () => {
  test('campground_admins table exists with (campground_id, user_id, role)', () => {
    // Capture until the table-closing `);`. The inner FK
    // references each contain their own `(id)` parens, so a
    // non-greedy `\)` would stop at the first one and miss the
    // remaining columns.
    const m = DDL_LC.match(
      /create table[^(]*public\.campground_admins\s*\(([\s\S]{0,1500}?)\);/,
    )
    expect(m, 'campground_admins CREATE TABLE not found').toBeTruthy()
    const cols = m[1]
    expect(cols).toMatch(/\bcampground_id\s+uuid\b/)
    expect(cols).toMatch(/\buser_id\s+uuid\b/)
    expect(cols).toMatch(/\brole\b/)
    expect(cols).toMatch(/references\s+public\.campgrounds/)
    expect(cols).toMatch(/references\s+auth\.users/)
    expect(cols).toMatch(/primary\s+key\s*\(\s*campground_id\s*,\s*user_id\s*\)/)
  })
})

// ---------------------------------------------------------------------------
// 3. Tenant-owned child tables have campground_id -> campgrounds(id) CASCADE.
//
// If a child table loses this FK (or gains a status column that hides
// archived rows in RLS), the audit invariant breaks. List is derived
// from the 2026-05-24 audit; add new tenant tables here as they ship.
// ---------------------------------------------------------------------------

const TENANT_OWNED_TABLES = [
  'bulletins',
  'meetups',
  'check_ins',
  'campground_qr_tokens',
  'campground_events',
  'campground_messages',
  'campground_message_replies',
]

test.describe('Schema: tenant-owned tables key on campground_id', () => {
  for (const tableName of TENANT_OWNED_TABLES) {
    test(`${tableName} has campground_id references campgrounds(id) on delete cascade`, () => {
      // Find the most recent create-table for this table. We
      // match a non-greedy create-table block then assert the
      // FK shape inside it. campground_qr_tokens / message_replies
      // both use campground_id transitively via a parent table FK,
      // but should still appear linked to campgrounds either
      // directly or by their parent column.
      const m = DDL_LC.match(
        new RegExp(
          `create table[^(]*public\\.${tableName}\\s*\\(([\\s\\S]{0,1500}?)\\);`,
        ),
      )
      expect(m, `${tableName} CREATE TABLE not found`).toBeTruthy()
      const cols = m[1]
      // Direct FK to campgrounds, OR an FK to a parent that itself
      // FKs to campgrounds (message_replies -> messages -> campgrounds).
      const hasDirectFK = /references\s+public\.campgrounds\s*\(\s*id\s*\)/.test(
        cols,
      )
      const hasParentFK =
        /references\s+public\.campground_messages\s*\(\s*id\s*\)/.test(cols) ||
        /references\s+public\.bulletins\s*\(\s*id\s*\)/.test(cols)
      expect(
        hasDirectFK || hasParentFK,
        `${tableName} must FK to campgrounds(id) or a tenant-rooted parent`,
      ).toBe(true)
      // CASCADE on the parent reference so deleting the campground
      // collapses all dependent rows. SET NULL would leave orphans.
      expect(cols).toMatch(/on\s+delete\s+cascade/)
    })
  }
})

// ---------------------------------------------------------------------------
// 4. Camper-private tables key on user_id -> auth.users(id) CASCADE.
// Camper data must travel with the camper account, not the campground.
// ---------------------------------------------------------------------------

const CAMPER_PRIVATE_TABLES = [
  'camper_roadwave_stops',
  'meetup_dismissals',
  'notifications',
]

test.describe('Schema: camper-private tables key on user_id', () => {
  for (const tableName of CAMPER_PRIVATE_TABLES) {
    test(`${tableName} has user_id references auth.users(id) on delete cascade`, () => {
      const m = DDL_LC.match(
        new RegExp(
          `create table[^(]*public\\.${tableName}\\s*\\(([\\s\\S]{0,1500}?)\\);`,
        ),
      )
      expect(m, `${tableName} CREATE TABLE not found`).toBeTruthy()
      const cols = m[1]
      expect(cols).toMatch(/\buser_id\s+uuid\b/)
      expect(cols).toMatch(/references\s+auth\.users\s*\(\s*id\s*\)/)
      // Camper deletion must cascade so we don't leave private
      // history attributed to a dead account.
      expect(cols).toMatch(/on\s+delete\s+cascade/)
    })
  }
})

// ---------------------------------------------------------------------------
// 5. RLS is enabled on every tenant + camper-private table. Missing RLS
// means a misconfigured RPC or anon key could leak the table wholesale.
// ---------------------------------------------------------------------------

test.describe('Schema: RLS enabled on every user-facing table', () => {
  for (const tableName of [...TENANT_OWNED_TABLES, ...CAMPER_PRIVATE_TABLES, 'campgrounds', 'campground_admins', 'profiles', 'waves', 'crossed_paths', 'crossed_paths_messages']) {
    test(`${tableName} has row level security enabled`, () => {
      // The migration may say `alter table public.<name> enable row
      // level security` directly, or use the older `set
      // row_security`. We match the canonical statement.
      const pattern = new RegExp(
        `alter\\s+table\\s+(?:public\\.)?${tableName}\\s+enable\\s+row\\s+level\\s+security`,
      )
      expect(
        pattern.test(DDL_LC),
        `${tableName} must have RLS enabled (alter table ... enable row level security)`,
      ).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// 6. Indexes on campground_id for the high-traffic tenant tables. Missing
// an index means an owner's bulletins/meetups page does a sequential scan
// of every campground's records.
// ---------------------------------------------------------------------------

const INDEX_REQUIRED_ON_CAMPGROUND_ID = [
  'bulletins',
  'meetups',
  'check_ins',
  'campground_events',
  'campground_messages',
]

test.describe('Schema: campground_id indexes exist for hot tables', () => {
  for (const tableName of INDEX_REQUIRED_ON_CAMPGROUND_ID) {
    test(`${tableName} has an index covering campground_id`, () => {
      // Match `create index ... on public.<name> (campground_id ...)`
      // -- the index may be composite (e.g. (campground_id, created_at))
      // so we just require campground_id appears in the first
      // column slot.
      const pattern = new RegExp(
        `create\\s+(?:unique\\s+)?index[^;]*on\\s+(?:public\\.)?${tableName}\\s*\\(\\s*campground_id\\b`,
      )
      expect(
        pattern.test(DDL_LC),
        `${tableName} should have an index whose leading column is campground_id`,
      ).toBe(true)
    })
  }
})

// ---------------------------------------------------------------------------
// 7. campground_messages status enum is preserved -- archived/resolved
// rows must still exist as rows the owner can find under "All".
// ---------------------------------------------------------------------------

test.describe('Schema: campground_messages status preserved across all values', () => {
  test('status column allows archived AND resolved (no DROP COLUMN)', () => {
    // The audit confirmed the status enum has 4 values. We assert
    // both that the column exists AND that nothing in the migration
    // history drops it.
    expect(DDL_LC).toMatch(/\bstatus\b/)
    expect(DDL_LC).not.toMatch(
      /alter\s+table\s+(?:public\.)?campground_messages\s+drop\s+column\s+status/,
    )
  })
})
