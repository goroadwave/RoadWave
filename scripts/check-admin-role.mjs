#!/usr/bin/env node
//
// Read-only check + targeted update for an admin account's role.
//
//   node scripts/check-admin-role.mjs <email>           # check only
//   node scripts/check-admin-role.mjs <email> --fix     # promote if guest
//
// "Fix" promotes the account to role='super_admin' and is_admin=true.
// The user_role enum (migration 0009) only defines guest/owner/
// super_admin — there is no 'admin' value — so we use super_admin
// alongside the is_admin boolean flag the (app) layout already reads.

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

const email = process.argv[2]
const fix = process.argv.includes('--fix')
if (!email) {
  console.error('Usage: node scripts/check-admin-role.mjs <email> [--fix]')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Find the auth.users row by email.
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
console.log(`email_confirmed_at = ${user.email_confirmed_at ?? 'null'}`)

// 2. Read profiles row.
const { data: profile, error: profileError } = await admin
  .from('profiles')
  .select('id, role, is_admin, display_name')
  .eq('id', user.id)
  .maybeSingle()
if (profileError) {
  console.error('profiles read failed:', profileError.message)
  process.exit(1)
}
if (!profile) {
  console.error(`No profiles row for ${email} — was the handle_new_user trigger skipped?`)
  process.exit(3)
}
console.log(`profile.role     = ${profile.role}`)
console.log(`profile.is_admin = ${profile.is_admin}`)
console.log(`profile.display_name = ${profile.display_name ?? 'null'}`)

// 3. Optionally fix.
const wantsFix =
  fix && (profile.role !== 'super_admin' || profile.is_admin !== true)

if (!fix) {
  console.log(
    '\n(Re-run with --fix to promote this account to role=super_admin + is_admin=true if needed.)',
  )
  process.exit(0)
}

if (!wantsFix) {
  console.log('\nAlready role=super_admin AND is_admin=true. No change needed.')
  process.exit(0)
}

console.log('\nApplying: role=super_admin, is_admin=true …')
const { error: updateError } = await admin
  .from('profiles')
  .update({ role: 'super_admin', is_admin: true })
  .eq('id', user.id)
if (updateError) {
  console.error('profiles update failed:', updateError.message)
  process.exit(1)
}

// Confirm.
const { data: after } = await admin
  .from('profiles')
  .select('role, is_admin')
  .eq('id', user.id)
  .single()
console.log(`profile.role     = ${after.role}`)
console.log(`profile.is_admin = ${after.is_admin}`)
console.log('\n✅ Updated. The post-auth helper will now route this account to /owner/dashboard.')
