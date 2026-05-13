#!/usr/bin/env node
//
// Idempotently provisions the "RoadWave Demo Campground" so the
// full QR → check-in → bulletin → admin loop can be tested end to
// end without touching real campgrounds.
//
// Safe to run repeatedly. Scoped strictly to slug
// "roadwave-demo-campground" — never touches any other campground.
//
//   node scripts/seed-demo-campground.mjs            # dry-run
//   node scripts/seed-demo-campground.mjs --apply    # actually writes
//
// What it provisions:
//   1. auth.users row for demo@getroadwave.com (the demo owner)
//   2. campgrounds row "RoadWave Demo Campground" (slug:
//      roadwave-demo-campground, subscription_status: active)
//   3. campground_admins link tying the demo owner to the campground
//   4. campground_qr_tokens row (auto-created by trigger; we just read it)
//   5. 6 fake camper auth users + profiles + check-ins:
//        - 3 Visible (Sage / Marcus / Priya — interests vary)
//        - 1 Quiet  (Jordan)
//        - 1 Invisible (Sam)
//        - 1 Campground Updates Only (Riley)
//      Each check-in has expires_at 30 days out so the dashboard
//      cards stay populated while you test.
//   6. 1 sample bulletin (welcome + coffee meetup)
//   7. 1 sample meetup (sunset walk)
//
// Re-running the seed wipes the bulletins/meetups/check-ins/events
// for the demo campground (and the 6 demo campers + their profiles)
// before re-inserting, so each run gives you a clean known state.
// The campground row + owner link survive (so the slug + QR URL
// never change between runs).

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
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.getroadwave.com'

const DEMO_SLUG = 'roadwave-demo-campground'
const DEMO_NAME = 'RoadWave Demo Campground'
const DEMO_OWNER_EMAIL = 'demo@getroadwave.com'

// 6 fake campers, mixed across visibility modes + interest slugs.
// Emails on the @example.com reserved domain so they can't receive
// or be confused for real accounts.
const DEMO_CAMPERS = [
  {
    email: 'demo-camper-1@example.com',
    username: 'demo_sage_walker',
    display_name: 'Sage Walker',
    privacy_mode: 'visible',
    rig_type: '30ft Class C',
    hometown: 'Bend, OR',
    status_tag: 'Coffee in the morning, fire at night.',
    interests: ['coffee', 'hiking', 'campfire'],
  },
  {
    email: 'demo-camper-2@example.com',
    username: 'demo_marcus_reyes',
    display_name: 'Marcus Reyes',
    privacy_mode: 'visible',
    rig_type: 'Truck camper',
    hometown: 'Tucson, AZ',
    status_tag: 'Walking the dog around the loop.',
    interests: ['dogs', 'kayaking', 'sports'],
  },
  {
    email: 'demo-camper-3@example.com',
    username: 'demo_priya_singh',
    display_name: 'Priya Singh',
    privacy_mode: 'visible',
    rig_type: 'Travel trailer',
    hometown: 'Asheville, NC',
    status_tag: 'Cards and live music if anyone wants to join.',
    interests: ['coffee', 'cards', 'live_music'],
  },
  {
    email: 'demo-camper-4@example.com',
    username: 'demo_jordan_lee',
    display_name: 'Jordan Lee',
    privacy_mode: 'quiet',
    rig_type: 'Class A motorhome',
    hometown: 'Portland, ME',
    status_tag: 'Hiking the back trail today.',
    interests: ['hiking', 'ebikes'],
  },
  {
    email: 'demo-camper-5@example.com',
    username: 'demo_sam_patel',
    display_name: 'Sam Patel',
    privacy_mode: 'invisible',
    rig_type: 'Van',
    hometown: 'Boulder, CO',
    status_tag: null,
    interests: ['campfire', 'cats'],
  },
  {
    email: 'demo-camper-6@example.com',
    username: 'demo_riley_chen',
    display_name: 'Riley Chen',
    privacy_mode: 'campground_updates_only',
    rig_type: 'Fifth wheel',
    hometown: 'Madison, WI',
    status_tag: 'Just here for the bulletins.',
    interests: [],
  },
]

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
console.log(`Demo slug: ${DEMO_SLUG}\n`)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function findAuthUserIdByEmail(email) {
  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const hit = data?.users.find((u) => u.email === email)
    if (hit) return hit.id
    if (!data?.users || data.users.length < perPage) return null
  }
  return null
}

async function ensureAuthUser(email, metadata = {}) {
  if (!APPLY) {
    console.log(`  [dry] ensure auth user: ${email}`)
    return null
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (created?.user) return created.user.id
  if (error && error.message.toLowerCase().includes('already')) {
    const existingId = await findAuthUserIdByEmail(email)
    if (existingId) return existingId
  }
  throw new Error(`ensureAuthUser(${email}): ${error?.message ?? 'unknown'}`)
}

// ---------------------------------------------------------------------------
// Step 1 — demo owner + campground + admin link
// ---------------------------------------------------------------------------

console.log('=== 1) Demo owner auth user')
const ownerId = await ensureAuthUser(DEMO_OWNER_EMAIL, {
  owner_name: 'Demo Owner',
  campground_name: DEMO_NAME,
  signup_source: 'seed_script',
})
console.log(`  owner user_id: ${ownerId ?? '(dry-run)'}\n`)

console.log('=== 2) Campground row')
let campgroundId = null
{
  const { data: existing } = await admin
    .from('campgrounds')
    .select('id')
    .eq('slug', DEMO_SLUG)
    .maybeSingle()
  if (existing) {
    console.log(`  campground already exists: ${existing.id}`)
    campgroundId = existing.id
  } else if (APPLY) {
    const { data: inserted, error } = await admin
      .from('campgrounds')
      .insert({
        slug: DEMO_SLUG,
        name: DEMO_NAME,
        city: 'Demo Pines',
        region: 'CA',
        owner_email: DEMO_OWNER_EMAIL,
        is_active: true,
        subscription_status: 'active',
        plan: 'monthly',
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .select('id')
      .single()
    if (error) throw new Error(`campgrounds insert: ${error.message}`)
    console.log(`  inserted: ${inserted.id}`)
    campgroundId = inserted.id
  } else {
    console.log('  [dry] would insert campgrounds row')
  }
}
console.log()

console.log('=== 3) campground_admins link')
if (APPLY && ownerId && campgroundId) {
  const { error } = await admin
    .from('campground_admins')
    .upsert(
      { campground_id: campgroundId, user_id: ownerId, role: 'owner' },
      { onConflict: 'campground_id,user_id' },
    )
  if (error) throw new Error(`campground_admins upsert: ${error.message}`)
  console.log('  linked')
} else {
  console.log('  [dry] would upsert owner link')
}
console.log()

console.log('=== 4) QR token (auto-created by trigger; verifying)')
let qrToken = null
if (campgroundId) {
  const { data: tokenRow } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', campgroundId)
    .maybeSingle()
  if (tokenRow) {
    qrToken = tokenRow.token
    console.log(`  token: ${qrToken}`)
  } else if (APPLY) {
    // Fallback if trigger didn't fire on a re-run after a failed insert.
    const { data: inserted, error } = await admin
      .from('campground_qr_tokens')
      .insert({ campground_id: campgroundId })
      .select('token')
      .single()
    if (error) throw new Error(`qr token insert: ${error.message}`)
    qrToken = inserted.token
    console.log(`  inserted token: ${qrToken}`)
  } else {
    console.log('  [dry] would create token')
  }
}
console.log()

// ---------------------------------------------------------------------------
// Step 5 — wipe + recreate per-run activity (bulletins / meetups / check-ins
// / events for the demo campground, plus the 6 demo camper rows)
// ---------------------------------------------------------------------------

console.log('=== 5) Reset per-run activity for demo campground')
if (APPLY && campgroundId) {
  // Delete in dependency order. campground_events / bulletins / meetups
  // cascade on campground delete but we're not deleting the campground.
  await admin.from('campground_events').delete().eq('campground_id', campgroundId)
  await admin.from('bulletins').delete().eq('campground_id', campgroundId)
  await admin.from('meetups').delete().eq('campground_id', campgroundId)
  await admin.from('check_ins').delete().eq('campground_id', campgroundId)
  console.log('  cleared bulletins / meetups / check_ins / events')
} else {
  console.log('  [dry] would clear activity rows')
}

// Also wipe the 6 demo camper profiles + auth users so we re-seed them
// fresh. profiles delete cascades to profile_interests + check_ins.
console.log('  demo campers:')
const camperIds = []
for (const c of DEMO_CAMPERS) {
  const existingId = APPLY ? await findAuthUserIdByEmail(c.email) : null
  if (APPLY && existingId) {
    const { error } = await admin.auth.admin.deleteUser(existingId)
    if (error) console.warn(`    delete ${c.email}: ${error.message}`)
    else console.log(`    deleted prior: ${c.email}`)
  }
}
console.log()

// ---------------------------------------------------------------------------
// Step 6 — re-seed the 6 demo campers
// ---------------------------------------------------------------------------

console.log('=== 6) Seed 6 demo campers + profiles + check-ins')

// Build {slug -> id} for interests so we can insert profile_interests rows
// by slug.
const interestIdBySlug = {}
{
  const { data: interests } = await admin
    .from('interests')
    .select('id, slug')
  for (const i of interests ?? []) interestIdBySlug[i.slug] = i.id
}

if (APPLY && campgroundId) {
  for (const c of DEMO_CAMPERS) {
    const userId = await ensureAuthUser(c.email, {
      seed_marker: 'roadwave-demo-camper',
    })
    camperIds.push(userId)

    // handle_new_user trigger created a profile row already. Update it
    // with our seed values.
    const { error: profileErr } = await admin
      .from('profiles')
      .update({
        username: c.username,
        display_name: c.display_name,
        rig_type: c.rig_type,
        hometown: c.hometown,
        status_tag: c.status_tag,
        privacy_mode: c.privacy_mode,
        role: 'guest',
      })
      .eq('id', userId)
    if (profileErr) console.warn(`    profile update ${c.email}: ${profileErr.message}`)

    // profile_interests join rows
    if (c.interests.length > 0) {
      const rows = c.interests
        .map((slug) => interestIdBySlug[slug])
        .filter(Boolean)
        .map((interestId) => ({ profile_id: userId, interest_id: interestId }))
      if (rows.length > 0) {
        const { error: piErr } = await admin
          .from('profile_interests')
          .upsert(rows, { onConflict: 'profile_id,interest_id' })
        if (piErr) console.warn(`    profile_interests ${c.email}: ${piErr.message}`)
      }
    }

    // Active check-in expiring in 30 days (so dashboard stays populated)
    const { error: ciErr } = await admin.from('check_ins').insert({
      profile_id: userId,
      campground_id: campgroundId,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    })
    if (ciErr) console.warn(`    check_in ${c.email}: ${ciErr.message}`)
    else
      console.log(
        `    ${c.display_name.padEnd(14)} · ${c.privacy_mode.padEnd(25)} · [${c.interests.join(', ')}]`,
      )
  }
} else {
  for (const c of DEMO_CAMPERS) {
    console.log(
      `    [dry] ${c.display_name.padEnd(14)} · ${c.privacy_mode.padEnd(25)} · [${c.interests.join(', ')}]`,
    )
  }
}
console.log()

// ---------------------------------------------------------------------------
// Step 7 — sample bulletin
// ---------------------------------------------------------------------------

console.log('=== 7) Sample bulletin')
if (APPLY && campgroundId && ownerId) {
  const { error } = await admin.from('bulletins').insert({
    campground_id: campgroundId,
    message:
      'Welcome campers! Coffee meetup tomorrow at 9 AM near the clubhouse. ☕',
    category: 'event',
    posted_by: ownerId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  })
  if (error) console.warn(`  bulletin insert: ${error.message}`)
  else console.log('  inserted')
} else {
  console.log('  [dry] would insert sample bulletin')
}
console.log()

// ---------------------------------------------------------------------------
// Step 8 — sample meetup
// ---------------------------------------------------------------------------

console.log('=== 8) Sample meetup')
if (APPLY && campgroundId && ownerId) {
  const startAt = new Date(Date.now() + 6 * 60 * 60 * 1000) // +6h
  const { error } = await admin.from('meetups').insert({
    campground_id: campgroundId,
    posted_by: ownerId,
    title: 'Sunset walk',
    description: 'Easy stroll around the back loop. All welcome.',
    location: 'Meet at the flagpole',
    start_at: startAt.toISOString(),
    end_at: new Date(startAt.getTime() + 60 * 60 * 1000).toISOString(),
  })
  if (error) console.warn(`  meetup insert: ${error.message}`)
  else console.log('  inserted')
} else {
  console.log('  [dry] would insert sample meetup')
}
console.log()

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

console.log('=== Summary')
console.log(`  Campground:        ${DEMO_NAME}`)
console.log(`  Slug:              ${DEMO_SLUG}`)
console.log(`  Owner email:       ${DEMO_OWNER_EMAIL}`)
if (qrToken) {
  console.log(
    `  Camper QR URL:     ${SITE_URL}/campground/${DEMO_SLUG}?token=${qrToken}`,
  )
} else {
  console.log('  Camper QR URL:     (run with --apply to materialize)')
}
console.log(`  Demo campers:      ${DEMO_CAMPERS.length} (3 visible, 1 quiet, 1 invisible, 1 updates-only)`)
console.log(`  Sample bulletin:   1`)
console.log(`  Sample meetup:     1`)
console.log()
console.log(
  APPLY
    ? '✓ Seed complete. Visit the camper QR URL on your phone, or sign in as the demo owner via /owner/login → magic link.'
    : 'Dry-run complete. Re-run with --apply to actually write.',
)
