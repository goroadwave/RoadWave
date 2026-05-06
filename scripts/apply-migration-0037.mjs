#!/usr/bin/env node
//
// Programmatic equivalent of supabase/migrations/0037_normalize_amenities.sql.
//
// The Supabase JS client doesn't expose raw SQL execution and we don't
// have a psql connection string in .env.local — so this script reads
// every row in `campgrounds`, rewrites any legacy slug-style amenity
// values to their display-label form, and writes back only when a row
// actually changed. Idempotent: re-running on already-normalised data
// is a no-op.
//
// Slug → label map matches the migration SQL exactly. Anything not in
// the map (custom amenities, already-label values) passes through.
//
//   node scripts/apply-migration-0037.mjs            # report only
//   node scripts/apply-migration-0037.mjs --apply    # actually update

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

const apply = process.argv.includes('--apply')

const SLUG_TO_LABEL = {
  full_hookups: 'Full Hookups',
  water_electric: 'Water/Electric',
  tent_sites: 'Tent Sites',
  wifi: 'WiFi',
  pool: 'Pool',
  dog_friendly: 'Dog-Friendly',
  laundry: 'Laundry',
  store: 'Store',
  restrooms: 'Restrooms',
  showers: 'Showers',
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: rows, error } = await admin
  .from('campgrounds')
  .select('id, name, slug, amenities')
if (error) {
  console.error('campgrounds read failed:', error.message)
  process.exit(1)
}

console.log(`Loaded ${rows?.length ?? 0} campgrounds.\n`)

let needsChange = 0
let changed = 0
let skippedClean = 0

for (const row of rows ?? []) {
  const before = Array.isArray(row.amenities) ? row.amenities : []
  const after = before.map((v) => SLUG_TO_LABEL[v] ?? v)

  const isChanged = before.some((v, i) => v !== after[i])
  if (!isChanged) {
    skippedClean++
    continue
  }

  needsChange++
  console.log(`• ${row.name} (slug=${row.slug})`)
  console.log(`    before: ${JSON.stringify(before)}`)
  console.log(`    after:  ${JSON.stringify(after)}`)

  if (!apply) continue

  const { error: updateError } = await admin
    .from('campgrounds')
    .update({ amenities: after })
    .eq('id', row.id)
  if (updateError) {
    console.error(`    UPDATE failed: ${updateError.message}`)
    continue
  }
  console.log(`    ✓ updated`)
  changed++
}

console.log()
console.log(`Summary: ${rows?.length ?? 0} rows scanned`)
console.log(`         ${skippedClean} already clean (no slug values)`)
console.log(`         ${needsChange} would change`)
console.log(`         ${changed} updated`)

if (!apply && needsChange > 0) {
  console.log()
  console.log('Dry run only. Re-run with --apply to commit the rewrites.')
} else if (apply && changed === needsChange && needsChange === 0) {
  console.log()
  console.log('✅ No legacy slug-style amenities found — DB already matches the new label format.')
}
