// @ts-check
//
// Verifies that anonymous (unauthenticated) database clients cannot
// read tables that should be admin-only or service-role-only. Catches
// the class of bug where someone accidentally relaxes RLS or grants
// read to PUBLIC on a sensitive table.
//
// Uses ONLY the anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY). Never uses
// the service-role key. The whole point of these tests is to be
// indistinguishable from a real anonymous client.
//
// Gated on env vars being present — skips with a clear message if not.
// Run via: NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… npm run test:qa

import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'node:path'

// Playwright's test runner doesn't auto-load .env.local. Pull it in
// explicitly so this test uses the same Supabase project the dev
// server / production runtime point at. Silently no-ops if the file
// is absent (CI), in which case the test below skips via the URL/ANON
// gate.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

test.describe('Anonymous RLS — sensitive tables not readable', () => {
  test.skip(!URL || !ANON, 'NEXT_PUBLIC_SUPABASE_URL/ANON_KEY not set in env')

  // Each table here is one we expect to be invisible to anon. A row
  // count > 0 from anon would mean RLS leaked.
  const SENSITIVE_TABLES = [
    'stripe_events',
    'owner_signup_submissions',
    'campground_qr_tokens',
    'legal_acks',
    'notifications',
    // waves/crossed_paths are scoped via RLS to the involved campers;
    // anon should see zero rows even if rows exist.
    'waves',
    'crossed_paths',
  ]

  for (const table of SENSITIVE_TABLES) {
    test(`anon cannot read public.${table}`, async () => {
      const anon = createClient(URL, ANON, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await anon
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1)
      // EITHER the query errored (RLS denied / no select grant) OR it
      // succeeded but returned zero rows. Both are acceptable.
      // A non-zero anon-visible row count is a security failure.
      if (error) {
        // PostgREST returns 401/403 for missing select privilege; rows
        // hidden by RLS just return empty. Either is fine.
        expect(error.message).toMatch(/permission|not.*allowed|rls|policy/i)
      } else {
        expect(
          data?.length ?? 0,
          `anon should not see any rows in ${table}; got ${data?.length}`,
        ).toBe(0)
      }
    })
  }

  // Regression test for GitHub issue #1 (resolved by migration 0047 on
  // 2026-05-19). Before 0047, public.campgrounds had an open SELECT
  // policy `using (true)` from migration 0001 that let anon read
  // archived rows plus owner_email + stripe_customer_id + billing
  // fields. 0047 narrowed anon SELECT to is_active=true rows AND
  // revoked column SELECT for the 14 sensitive columns. This test
  // asserts the post-fix invariant: any campground anon can read must
  // be is_active=true. Future RLS regressions on this table fail here.
  test(
    'anon CAN read campgrounds (is_active=true rows only)',
    async () => {
      // Defensive: public campgrounds list must remain readable so the
      // welcome pages, admin tools (with admin role), etc. work.
      const anon = createClient(URL, ANON, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data, error } = await anon
        .from('campgrounds')
        .select('id, slug, name, is_active')
        .limit(20)
      expect(error?.message ?? null, 'anon read campgrounds should succeed').toBeNull()
      // Whatever anon sees must all be is_active=true; archived rows
      // must be hidden from anon.
      for (const row of data ?? []) {
        expect(row.is_active, `${row.slug} should be is_active=true if visible to anon`).toBe(true)
      }
    },
  )
})
