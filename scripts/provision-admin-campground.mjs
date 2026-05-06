#!/usr/bin/env node
//
// Provision a test campground for an admin/super-admin account so the
// /owner/dashboard, /owner/qr, and /owner/marketing pages have data to
// load. Idempotent — re-running is a no-op if the user is already
// linked as an admin to a campground that has a QR token.
//
//   node scripts/provision-admin-campground.mjs <email> \
//        --name "RoadWave HQ" --city Orlando --state FL [--apply]
//
// Without --apply this is a dry run that just reports what it would
// do. With --apply it inserts into:
//
//   1. campgrounds          (slug, name, city, region, timezone,
//                            is_active=true, subscription_status='active',
//                            owner_email)
//   2. campground_admins    (campground_id, user_id, role='owner')
//   3. campground_qr_tokens (campground_id, token=randomUUID)
//      — only if a trigger didn't already insert one.

import path from 'node:path'
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const email = args[0]
const apply = args.includes('--apply')

function flag(name, fallback) {
  const idx = args.indexOf(name)
  if (idx === -1 || idx === args.length - 1) return fallback
  return args[idx + 1]
}

const cgName = flag('--name', 'RoadWave HQ')
const cgCity = flag('--city', 'Orlando')
const cgState = flag('--state', 'FL')

if (!email) {
  console.error(
    'Usage: node scripts/provision-admin-campground.mjs <email> [--name "..."] [--city "..."] [--state XX] [--apply]',
  )
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Find auth.users row.
const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
})
if (listError) {
  console.error('listUsers failed:', listError.message)
  process.exit(1)
}
const user = list.users.find((u) => u.email === email)
if (!user) {
  console.error(`No auth.user found for ${email}`)
  process.exit(2)
}
console.log(`auth.users.id  = ${user.id}`)
console.log(`email          = ${user.email}`)

// 2. Existing campground_admins?
const { data: existingLink } = await admin
  .from('campground_admins')
  .select('campground_id, role')
  .eq('user_id', user.id)
  .maybeSingle()

if (existingLink) {
  console.log(
    `\nAccount is already linked to campground ${existingLink.campground_id} as ${existingLink.role}.`,
  )
  await reportCampground(existingLink.campground_id)
  process.exit(0)
}

// 3. No campground yet. Pick a unique slug from the requested name.
const baseSlug = slugify(cgName) || 'campground'
const slug = await uniqueSlug(baseSlug)
console.log(`\nWill create campground:`)
console.log(`  name           = ${cgName}`)
console.log(`  slug           = ${slug}`)
console.log(`  city, state    = ${cgCity}, ${cgState}`)
console.log(`  is_active      = true`)
console.log(`  subscription_status = active`)
console.log(`  owner_email    = ${user.email}`)
console.log(`  + campground_admins (user_id=${user.id}, role=owner)`)
console.log(`  + campground_qr_tokens (token=randomUUID, if not auto-seeded)`)

if (!apply) {
  console.log('\n(Dry run. Re-run with --apply to insert these rows.)')
  process.exit(0)
}

// 4. Insert campground.
const { data: cg, error: cgError } = await admin
  .from('campgrounds')
  .insert({
    name: cgName,
    slug,
    city: cgCity,
    region: cgState,
    timezone: 'America/New_York',
    is_active: true,
    subscription_status: 'active',
    owner_email: user.email,
  })
  .select('id, slug, name')
  .single()
if (cgError || !cg) {
  console.error('campgrounds insert failed:', cgError?.message)
  process.exit(1)
}
console.log(`\n✓ inserted campgrounds.id = ${cg.id}`)

// 5. Link as owner.
const { error: linkError } = await admin
  .from('campground_admins')
  .insert({ campground_id: cg.id, user_id: user.id, role: 'owner' })
if (linkError) {
  console.error('campground_admins insert failed:', linkError.message)
  process.exit(1)
}
console.log(`✓ inserted campground_admins (role=owner)`)

// 6. Make sure a QR token exists. The standard schema has a trigger
// that auto-creates one on campground insert; we still check + insert
// defensively in case the trigger isn't present in this environment.
const { data: existingToken } = await admin
  .from('campground_qr_tokens')
  .select('token')
  .eq('campground_id', cg.id)
  .maybeSingle()

if (existingToken) {
  console.log(`✓ campground_qr_tokens already has a row (token=${existingToken.token})`)
} else {
  const token = crypto.randomUUID()
  const { error: tokenError } = await admin
    .from('campground_qr_tokens')
    .insert({ campground_id: cg.id, token })
  if (tokenError) {
    console.error('campground_qr_tokens insert failed:', tokenError.message)
    process.exit(1)
  }
  console.log(`✓ inserted campground_qr_tokens (token=${token})`)
}

await reportCampground(cg.id)
console.log(
  '\n✅ /owner/marketing should now render the full asset set for this account.',
)

// ---- helpers --------------------------------------------------

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function uniqueSlug(base) {
  let candidate = base
  for (let i = 0; i < 10; i++) {
    const { data } = await admin
      .from('campgrounds')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data) return candidate
    candidate = `${base}-${i + 2}`
  }
  return `${base}-${Date.now()}`
}

async function reportCampground(id) {
  const { data } = await admin
    .from('campgrounds')
    .select('id, name, slug, city, region, is_active, subscription_status')
    .eq('id', id)
    .maybeSingle()
  const { data: token } = await admin
    .from('campground_qr_tokens')
    .select('token')
    .eq('campground_id', id)
    .maybeSingle()
  console.log(`\nCurrent state for campground ${id}:`)
  console.log(`  name           = ${data?.name}`)
  console.log(`  slug           = ${data?.slug}`)
  console.log(`  city, region   = ${data?.city}, ${data?.region}`)
  console.log(`  is_active      = ${data?.is_active}`)
  console.log(`  subscription_status = ${data?.subscription_status}`)
  console.log(`  qr token       = ${token?.token ?? 'none'}`)
}
