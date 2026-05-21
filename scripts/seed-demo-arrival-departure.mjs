// One-shot seed: populate Arrival & Departure (mig 0060) fields on
// the demo campground so the new card renders on the public QR
// hub + signed-in hub + auth-page strip for anyone exploring the
// app. Idempotent — re-running just overwrites the same values.
//
// Usage:
//   node scripts/seed-demo-arrival-departure.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from
// .env.local (loaded by dotenv). Service role bypasses RLS because
// updating a public.campgrounds row is owner-only via RLS otherwise
// and this script ships seed data, not a user action.

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

const DEMO_SLUG = 'roadwave-demo-campground'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Run from the repo root so .env.local is picked up.',
  )
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const update = {
  check_in_time: '2:00 PM',
  check_out_time: '11:00 AM',
  early_check_in_note:
    'Early check-in may be available — call the office to confirm.',
  late_check_out_note:
    'Late checkout up to 1 PM is sometimes available; ask at the office.',
  arrival_departure_note:
    'Office is staffed 9 AM – 9 PM. After-hours envelope at the gate for late arrivals.',
}

console.log(`Updating demo campground "${DEMO_SLUG}" with sample Arrival & Departure values…`)
const { data, error } = await admin
  .from('campgrounds')
  .update(update)
  .eq('slug', DEMO_SLUG)
  .select('slug, name, check_in_time, check_out_time, arrival_departure_note')

if (error) {
  console.error('Update failed:', error.message)
  process.exit(1)
}
if (!data || data.length === 0) {
  console.error(`No campground row matched slug=${DEMO_SLUG}.`)
  process.exit(1)
}

console.log('✓ Update applied. Row now contains:')
console.log(JSON.stringify(data[0], null, 2))
