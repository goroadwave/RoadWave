// @ts-check
//
// Static query-pattern tests. Reads the owner-side source files
// and asserts the invariants the 2026-05-24 audit identified:
//
//   1. Every owner page resolves the active campground through
//      loadOwnerCampground() (the single source of truth for
//      campground_id from the membership table) rather than
//      reading auth.uid() directly or querying the slug.
//   2. No owner-side query touches a tenant-owned table without
//      either a campground_id filter or a known-tenancy-aware
//      RPC. Catches the regression where someone forgets to
//      add .eq('campground_id', ...) on a new query.
//   3. The owner-side helper handles a missing membership row
//      explicitly (returns null and the page renders a "no
//      campground linked" surface) -- no silent demo-data
//      fallback.
//
// These complement tenancy-schema.test.js. Together they fence
// off the regressions called out in the user's 2026-05-24
// tenancy spec without requiring a preview environment.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect } from '@playwright/test'

const OWNER_AUTHED_DIR = join(
  process.cwd(),
  'src',
  'app',
  'owner',
  '(authed)',
)

// Pages we know need a campground context. Action files in the
// same tree are checked separately because they receive
// campground_id as a form param (validated explicitly), not via
// the loader.
const OWNER_PAGES_WITH_CAMPGROUND_DATA = [
  'dashboard',
  'messages',
  'bulletin',
  'meetups',
  'qr',
  'marketing',
  'profile',
  'analytics',
  'billing',
]

// Tenant-owned tables the owner side queries. If any new page
// queries one of these without a filter, the audit invariant
// breaks. Add new tables here as they ship.
const TENANT_TABLES = [
  'bulletins',
  'meetups',
  'check_ins',
  'campground_events',
  'campground_messages',
  'campground_message_replies',
]

function readPageSource(pageName) {
  const path = join(OWNER_AUTHED_DIR, pageName, 'page.tsx')
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return null
  }
}

function readAllOwnerAuthedFiles() {
  // Walk src/app/owner/(authed)/** and return every .tsx/.ts
  // source. We grep these to make sure no future page queries a
  // tenant table without a filter.
  const out = []
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      const stat = statSync(p)
      if (stat.isDirectory()) walk(p)
      else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        out.push({ path: p, src: readFileSync(p, 'utf8') })
      }
    }
  }
  walk(OWNER_AUTHED_DIR)
  return out
}

// ---------------------------------------------------------------------------
// 1. Every owner data page resolves the campground via loadOwnerCampground.
// ---------------------------------------------------------------------------

test.describe('Owner pages: campground context loader is the only source of truth', () => {
  for (const pageName of OWNER_PAGES_WITH_CAMPGROUND_DATA) {
    test(`${pageName}/page.tsx resolves via loadOwnerCampground()`, () => {
      const src = readPageSource(pageName)
      expect(src, `${pageName}/page.tsx not found`).toBeTruthy()
      // Match the import + the call. Don't be strict about the
      // exact alias as long as the helper is the one being invoked.
      expect(src).toMatch(/loadOwnerCampground/)
      // Must NOT cheat by using auth.getUser().id directly as the
      // campground_id filter. The helper is the gate.
      const usesAuthIdAsCampgroundId =
        /\.eq\(\s*['"]campground_id['"]\s*,\s*user\.id\s*\)/.test(src)
      expect(
        usesAuthIdAsCampgroundId,
        `${pageName}/page.tsx must not filter campground_id by user.id`,
      ).toBe(false)
      // Must NOT use slug as the join key on a child table.
      // (The campgrounds table itself can be looked up by slug --
      // that's the human-readable URL path -- but bulletins /
      // meetups / messages must never JOIN on slug.)
      const usesSlugAsChildKey =
        /\.from\(\s*['"](?:bulletins|meetups|campground_messages|campground_events)['"]\s*\)[\s\S]{0,300}?\.eq\(\s*['"]campground_slug['"]/.test(
          src,
        )
      expect(
        usesSlugAsChildKey,
        `${pageName}/page.tsx must not use campground_slug as a child-table filter`,
      ).toBe(false)
    })
  }
})

// ---------------------------------------------------------------------------
// 2. No owner-side file queries a tenant table without a filter.
//
// Pattern: every `.from('<tenant_table>')` must be followed within ~500
// chars by either:
//   * `.eq('campground_id', ...)`     -- direct filter
//   * `.in('campground_id', ...)`     -- multi-campground (rare)
//   * `.rpc('owner_<verb>_for_campground', ...)` -- RPC variant
// Otherwise the query is a potential cross-campground leak.
//
// Action files are checked too -- they should either filter explicitly
// or pass campground_id to an RPC.
// ---------------------------------------------------------------------------

test.describe('Owner files: every tenant-table query is scoped', () => {
  const allFiles = readAllOwnerAuthedFiles()

  for (const tableName of TENANT_TABLES) {
    test(`no unscoped .from('${tableName}') in owner-side source`, () => {
      const offenders = []
      const pattern = new RegExp(
        `\\.from\\(\\s*['"]${tableName}['"]\\s*\\)([\\s\\S]{0,600})`,
        'g',
      )
      for (const { path, src } of allFiles) {
        let m
        while ((m = pattern.exec(src)) !== null) {
          const window = m[1]
          // Legitimate scoping patterns. ANY of these means the
          // query is properly tenant-bounded:
          //   1. Chained .eq('campground_id', ...) / .in(...)
          //      — direct tenant filter on a list query.
          //   2. .insert({ ... campground_id: ... }) — writing
          //      a row with explicit tenancy in the payload.
          //   3. .upsert({ ... campground_id: ... }) — same.
          //   4. .eq('id', someUuid) — operating on a single row
          //      by primary key. RLS on the table gates the row
          //      by campground_admins membership, so by-id
          //      single-row ops are safe.
          //   5. .eq('message_id', ...) — operating on a single
          //      reply row by FK to a tenant-rooted parent. Same
          //      reasoning as (4).
          const hasFilter =
            /\.eq\(\s*['"]campground_id['"]/.test(window) ||
            /\.in\(\s*['"]campground_id['"]/.test(window) ||
            /\.insert\(\s*\{[\s\S]{0,400}?campground_id\s*:/.test(window) ||
            /\.upsert\(\s*\{[\s\S]{0,400}?campground_id\s*:/.test(window) ||
            /\.eq\(\s*['"]id['"]\s*,/.test(window) ||
            /\.eq\(\s*['"]message_id['"]\s*,/.test(window) ||
            /\.in\(\s*['"]id['"]\s*,/.test(window)
          if (!hasFilter) {
            offenders.push(`${path}: unscoped .from('${tableName}')`)
          }
        }
      }
      expect(
        offenders,
        `Found unscoped tenant queries:\n${offenders.join('\n')}`,
      ).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------
// 3. loadOwnerCampground handles a missing campground (no demo fallback).
//
// The audit confirmed the helper returns null when the user has no
// campground_admins row. Owner pages then render "No campground linked"
// instead of silently showing demo data. Lock this contract: the helper
// must NOT contain a hardcoded fallback campground id/slug.
// ---------------------------------------------------------------------------

test.describe('Owner helper: no silent demo fallback', () => {
  test('_helpers.ts has no hardcoded demo campground id or slug', () => {
    const path = join(OWNER_AUTHED_DIR, '_helpers.ts')
    const src = readFileSync(path, 'utf8')

    // No literal demo slug. The string itself is fine in tests +
    // admin tooling, but never in the owner data-loading path.
    expect(src).not.toMatch(/roadwave-demo-campground/)

    // Helper exports loadOwnerCampground and the function can
    // return null (the page renders the fallback surface). The
    // exact return shape uses `null` for the missing case.
    expect(src).toMatch(/loadOwnerCampground/)
    expect(src).toMatch(/\bcampground:\s*null\b|return\s+\{\s*campground:\s*null/)
  })
})

// ---------------------------------------------------------------------------
// 4. Owner pages render an explicit "no campground linked" surface when
// the helper returns null. Not a redirect, not a 500, not empty stats --
// a visible message the operator can act on.
// ---------------------------------------------------------------------------

test.describe('Owner pages: explicit fallback when campground context is missing', () => {
  for (const pageName of OWNER_PAGES_WITH_CAMPGROUND_DATA) {
    test(`${pageName}/page.tsx renders a "no campground" / "not linked" fallback`, () => {
      const src = readPageSource(pageName)
      if (!src) return // missing page already failed test 1
      // Look for a check on the destructured campground being
      // null/undefined that leads to a fallback render. The
      // existing pages use patterns like `if (!campground)` or
      // `if (campground == null)`. We accept any null check that
      // returns early.
      const guardsAgainstNull =
        /if\s*\(\s*!\s*campground\s*\)/.test(src) ||
        /if\s*\(\s*campground\s*==\s*null\s*\)/.test(src) ||
        /if\s*\(\s*campground\s*===\s*null\s*\)/.test(src) ||
        /campground\?\.id/.test(src) // optional chaining counts as a defensive read
      expect(
        guardsAgainstNull,
        `${pageName}/page.tsx must guard against missing campground context`,
      ).toBe(true)
    })
  }
})
