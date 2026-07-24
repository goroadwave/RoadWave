#!/usr/bin/env node
//
// Resets the per-run activity on the RoadWave Demo Campground:
//   - clears bulletins / meetups / check_ins / campground_events
//   - deletes the 6 demo camper auth users (demo-camper-N@example.com)
//   - deletes throwaway quickcheckin-<random>@example.com auth users
//     created by the tests/smoke.test.js QR check-in flow (one per CI run)
//
// Keeps the campground row, the QR token, and the demo owner auth user
// intact so re-seeding is fast and the QR URL stays stable.
//
// Strictly scoped to slug "roadwave-demo-campground" — refuses to run
// against any other campground.
//
//   node scripts/reset-demo-campground.mjs            # dry-run
//   node scripts/reset-demo-campground.mjs --apply    # actually delete

import path from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds in .env.local')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const DEMO_SLUG = 'roadwave-demo-campground'
const CAMPER_EMAIL_RE =
  /^(demo-camper-\d+|quickcheckin-[a-z0-9]+)@example\.com$/i

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
console.log(`Demo slug: ${DEMO_SLUG}\n`)

const { data: cg } = await admin
  .from('campgrounds')
  .select('id, name, slug')
  .eq('slug', DEMO_SLUG)
  .maybeSingle()

if (!cg) {
  console.log('No campground with the demo slug. Nothing to reset.')
  process.exit(0)
}

// Belt-and-braces: refuse to touch anything if the campground name has
// somehow been changed away from the demo identifier. Prevents this
// script from ever running against a non-demo campground that happens
// to inherit the slug.
if (cg.name !== 'RoadWave Demo Campground') {
  console.error(
    `ABORT — slug ${DEMO_SLUG} exists but name is ${JSON.stringify(cg.name)}, not "RoadWave Demo Campground". Refusing to reset.`,
  )
  process.exit(1)
}

console.log(`Found demo campground: ${cg.id} (${cg.slug})\n`)

console.log('=== Counts BEFORE reset')
for (const table of ['bulletins', 'meetups', 'check_ins', 'campground_events']) {
  const { count } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('campground_id', cg.id)
  console.log(`  ${table.padEnd(20)}: ${count ?? 0}`)
}

// Enumerate the throwaway auth users we'd delete by walking listUsers and
// matching either the seeded demo-camper-N@example.com pattern or the
// quickcheckin-<random>@example.com pattern from the QR check-in smoke test.
//
// listUsers has shown transient "invalid JWT / unrecognized kid" errors on
// Supabase's side (same class of error that caused the createUser failure
// this cleanup exists to work around). Retry each page a few times before
// giving up -- silently breaking the loop on the first error would
// undercount and leave this script's own --apply run incomplete.
async function listUsersPage(page, perPage) {
  const MAX_ATTEMPTS = 5
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (!error) return data
    console.warn(`  listUsers page ${page} attempt ${attempt} failed: ${error.message}`)
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 500))
    else throw new Error(`listUsers page ${page} failed after ${MAX_ATTEMPTS} attempts: ${error.message}`)
  }
}

const camperIds = []
let page = 1
const perPage = 200
for (;;) {
  const data = await listUsersPage(page, perPage)
  for (const u of data?.users ?? []) {
    if (u.email && CAMPER_EMAIL_RE.test(u.email)) camperIds.push(u.id)
  }
  if (!data?.users || data.users.length < perPage) break
  page += 1
}
console.log(`  demo campers (auth): ${camperIds.length}\n`)

if (!APPLY) {
  console.log('Dry-run complete. Re-run with --apply to delete.')
  process.exit(0)
}

console.log('=== Deleting…')
await admin.from('campground_events').delete().eq('campground_id', cg.id)
await admin.from('bulletins').delete().eq('campground_id', cg.id)
await admin.from('meetups').delete().eq('campground_id', cg.id)
await admin.from('check_ins').delete().eq('campground_id', cg.id)
console.log('  cleared bulletins / meetups / check_ins / events')

let deletedCount = 0
const failedIds = []
for (const uid of camperIds) {
  let lastError = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (!error) {
      lastError = null
      break
    }
    lastError = error
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 400))
  }
  if (lastError) {
    console.warn(`  delete user ${uid} failed after retries: ${lastError.message}`)
    failedIds.push(uid)
  } else {
    deletedCount++
  }
}
console.log(`  deleted ${deletedCount} of ${camperIds.length} demo camper auth users`)
if (failedIds.length > 0) {
  console.log(`  FAILED to delete ${failedIds.length} account(s): ${failedIds.join(', ')}`)
}

console.log('\n=== Counts AFTER reset')
for (const table of ['bulletins', 'meetups', 'check_ins', 'campground_events']) {
  const { count } = await admin
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('campground_id', cg.id)
  console.log(`  ${table.padEnd(20)}: ${count ?? 0}`)
}

console.log('\n✓ Reset complete. Campground row + owner link + QR token preserved.')
console.log('  Re-run scripts/seed-demo-campground.mjs --apply to repopulate.')
