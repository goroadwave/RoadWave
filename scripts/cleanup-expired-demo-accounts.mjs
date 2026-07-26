#!/usr/bin/env node
//
// Scheduled, unattended cleanup of expired throwaway demo/test auth
// accounts (see README.md "Maintenance" section for the full incident
// history, and scripts/lib/demo-account-patterns.mjs for the shared
// pattern definition).
//
// Safety properties, by construction:
//   1. Email pattern match — only ever touches accounts matching
//      CLEANUP_EMAIL_RE (demo-camper-N@example.com or
//      quickcheckin-<random>@example.com). @example.com is IANA-reserved
//      and cannot be a real person's address, so no production account
//      can ever match.
//   2. Campground identity re-check — refuses to run unless the demo
//      campground row's name is exactly "RoadWave Demo Campground",
//      exactly like reset-demo-campground.mjs.
//   3. Age gate (MIN_AGE_HOURS, default 48h) — an account created minutes
//      ago by a concurrently-running smoke test is never touched, even
//      if this job happens to run at the same moment. 48h is a 2x buffer
//      over the 24h check-in expiry the rest of the app already uses.
//   4. Circuit breaker (MAX_DELETE_PER_RUN, default 2000) — aborts
//      without deleting anything if the eligible set is anomalously
//      large, on the theory that a regex/logic bug should fail loud, not
//      mass-delete silently.
//   5. CSV audit export of every eligible account, written BEFORE any
//      deletion is attempted.
//
// Usage:
//   node scripts/cleanup-expired-demo-accounts.mjs            # dry-run
//   node scripts/cleanup-expired-demo-accounts.mjs --apply    # delete
//
// Env overrides (all optional):
//   CLEANUP_MIN_AGE_HOURS      default 48
//   CLEANUP_MAX_DELETE_PER_RUN default 2000
//
// Emits one structured JSON line per event to stdout (event=... fields),
// so a log aggregator (Vercel/GitHub Actions log search, Datadog, etc.)
// can answer "how many accounts were created / deleted / failed, and how
// often did we retry" without parsing prose. Also writes a Markdown
// summary to $GITHUB_STEP_SUMMARY when running in GitHub Actions.

import path from 'node:path'
import fs from 'node:fs'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { CLEANUP_EMAIL_RE } from './lib/demo-account-patterns.mjs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase admin creds (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  process.exit(1)
}

const APPLY = process.argv.includes('--apply')
const DEMO_SLUG = 'roadwave-demo-campground'
const MIN_AGE_HOURS = Number(process.env.CLEANUP_MIN_AGE_HOURS ?? 48)
const MAX_DELETE_PER_RUN = Number(process.env.CLEANUP_MAX_DELETE_PER_RUN ?? 2000)
const RECENT_WINDOW_HOURS = 24 // window for the "created recently" metric

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function log(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }))
}

let totalRetryAttempts = 0

// Shared retry wrapper — every Supabase Admin API call in this script goes
// through it, so retry counts are uniformly observable via the
// "cleanup.retry_attempt" / "cleanup.retry_exhausted" log events. This is
// the same class of transient "invalid JWT / unrecognized kid" error
// documented in README.md, not something specific to any one endpoint.
async function withRetry(fn, { label, maxAttempts = 3 }) {
  let lastError = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data, error } = await fn()
    if (!error) {
      if (attempt > 1) log('cleanup.retry_succeeded', { label, attempt })
      return { data, error: null }
    }
    lastError = error
    totalRetryAttempts++
    log('cleanup.retry_attempt', { label, attempt, maxAttempts, error: error.message })
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 500))
  }
  log('cleanup.retry_exhausted', { label, maxAttempts, error: lastError?.message })
  return { data: null, error: lastError }
}

function writeSummary(s) {
  const lines = [
    `## Demo account cleanup — ${new Date().toISOString()}`,
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Mode | ${s.mode} |`,
    `| Total auth users scanned | ${s.totalUsers} |`,
    `| Matched throwaway pattern | ${s.matched} |`,
    `| Created in last ${RECENT_WINDOW_HOURS}h | ${s.createdRecently} |`,
    `| Eligible for deletion (older than ${MIN_AGE_HOURS}h) | ${s.eligible} |`,
    `| Deleted | ${s.deleted} |`,
    `| Failed | ${s.failed.length} |`,
    `| Retry attempts (across whole run) | ${s.retryCount} |`,
    `| Duration | ${(s.durationMs / 1000).toFixed(1)}s |`,
  ]
  if (s.failed.length > 0) {
    lines.push('', '### Failed deletions', '', '| id | email | error |', '|---|---|---|')
    for (const f of s.failed) lines.push(`| ${f.id} | ${f.email} | ${f.error} |`)
  }
  const text = lines.join('\n') + '\n'
  console.log('\n' + text)
  const summaryPath = process.env.GITHUB_STEP_SUMMARY
  if (summaryPath) fs.appendFileSync(summaryPath, text)
}

const startedAt = Date.now()

log('cleanup.started', {
  mode: APPLY ? 'apply' : 'dry-run',
  minAgeHours: MIN_AGE_HOURS,
  maxDeletePerRun: MAX_DELETE_PER_RUN,
})

// Safety guard 2: re-verify campground identity, exactly like
// reset-demo-campground.mjs, before touching anything.
const { data: cg, error: cgError } = await admin
  .from('campgrounds')
  .select('id, name, slug')
  .eq('slug', DEMO_SLUG)
  .maybeSingle()

if (cgError) {
  // Surfaced separately from "not found" -- a real Supabase error here
  // (auth/permissions/network) looks identical to "no such campground" if
  // silently discarded, and the two have very different fixes.
  log('cleanup.aborted', { reason: 'demo campground identity check errored', error: cgError.message, code: cgError.code })
  process.exit(1)
}
if (!cg || cg.name !== 'RoadWave Demo Campground') {
  log('cleanup.aborted', { reason: 'demo campground identity check failed', found: cg ?? null })
  process.exit(1)
}

// Walk every auth user, retrying transient failures per page.
let page = 1
const perPage = 200
const allUsers = []
for (;;) {
  const { data, error } = await withRetry(
    () => admin.auth.admin.listUsers({ page, perPage }),
    { label: 'listUsers', maxAttempts: 5 },
  )
  if (error) {
    log('cleanup.aborted', { reason: 'listUsers failed after retries', error: error.message })
    process.exit(1)
  }
  const users = data?.users ?? []
  allUsers.push(...users)
  if (users.length < perPage) break
  page += 1
}

const now = Date.now()
const matched = allUsers.filter((u) => u.email && CLEANUP_EMAIL_RE.test(u.email))
const eligible = matched.filter((u) => now - new Date(u.created_at).getTime() >= MIN_AGE_HOURS * 3_600_000)
const createdRecently = matched.filter((u) => now - new Date(u.created_at).getTime() < RECENT_WINDOW_HOURS * 3_600_000)

log('cleanup.scanned', {
  totalUsers: allUsers.length,
  matchedThrowawayPattern: matched.length,
  eligibleForDeletion: eligible.length,
  createdInLast24h: createdRecently.length,
  protectedByAgeBuffer: matched.length - eligible.length,
})

// Safety guard 4: circuit breaker.
if (eligible.length > MAX_DELETE_PER_RUN) {
  log('cleanup.aborted', {
    reason: 'eligibleForDeletion exceeds MAX_DELETE_PER_RUN safety cap — aborting without deleting anything',
    eligibleForDeletion: eligible.length,
    maxDeletePerRun: MAX_DELETE_PER_RUN,
  })
  process.exit(1)
}

// Safety guard 5: CSV audit export BEFORE any deletion.
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const csvLines = ['id,email,created_at,last_sign_in_at']
for (const u of eligible) csvLines.push([esc(u.id), esc(u.email), esc(u.created_at), esc(u.last_sign_in_at)].join(','))
const csvPath = path.resolve(process.cwd(), `cleanup-audit-${new Date().toISOString().slice(0, 10)}.csv`)
fs.writeFileSync(csvPath, csvLines.join('\n') + '\n')
log('cleanup.audit_exported', { path: csvPath, rows: eligible.length })

if (!APPLY) {
  const durationMs = Date.now() - startedAt
  log('cleanup.dry_run_complete', { wouldDelete: eligible.length, durationMs })
  writeSummary({
    mode: 'dry-run',
    totalUsers: allUsers.length,
    matched: matched.length,
    createdRecently: createdRecently.length,
    eligible: eligible.length,
    deleted: 0,
    failed: [],
    retryCount: totalRetryAttempts,
    durationMs,
  })
  process.exit(0)
}

let deletedCount = 0
const failed = []
for (const u of eligible) {
  const { error } = await withRetry(() => admin.auth.admin.deleteUser(u.id), { label: 'deleteUser', maxAttempts: 3 })
  if (error) {
    failed.push({ id: u.id, email: u.email, error: error.message })
  } else {
    deletedCount++
  }
}

const durationMs = Date.now() - startedAt
log('cleanup.completed', { deleted: deletedCount, failed: failed.length, retries: totalRetryAttempts, durationMs })
if (failed.length > 0) log('cleanup.failures', { failed })

writeSummary({
  mode: 'apply',
  totalUsers: allUsers.length,
  matched: matched.length,
  createdRecently: createdRecently.length,
  eligible: eligible.length,
  deleted: deletedCount,
  failed,
  retryCount: totalRetryAttempts,
  durationMs,
})

// Non-zero exit on any failure so the CI job goes red instead of silently
// swallowing a partial cleanup.
process.exit(failed.length > 0 ? 1 : 0)
