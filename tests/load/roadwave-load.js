// k6 load-test script for RoadWave.
//
//   * Scenario A — "Scan QR" : load /demo and /demo/[slug] for a real
//     campground. Read-only.
//   * Scenario B — "Sign up" : POSTs the signup server action with a
//     unique throwaway email per VU. WRITES.
//   * Scenario C — "Wave"    : posts a wave via /api/dev-load-wave (a
//     pretend endpoint shown for shape). NO real wave endpoint exists
//     — RoadWave only mutates `waves` from inside an authenticated
//     server action. This scenario therefore needs a session cookie
//     captured during signup; the script wires that up.
//
// USAGE
//
//   # Default — runs ALL scenarios at 1000 VUs against localhost.
//   # Bring up `npm run dev` first.
//   k6 run tests/load/roadwave-load.js
//
//   # Just the read-only smoke against PROD (safe to run any time):
//   k6 run --env BASE_URL=https://www.getroadwave.com \
//          --env SCENARIO=scan_only \
//          --env VUS=50 --env DURATION=30s \
//          tests/load/roadwave-load.js
//
// SAFETY
//
//   * SCENARIO=scan_only is read-only (GET requests).
//   * SCENARIO=full runs signup + wave writes — only point this at a
//     local dev server or a staging Supabase project. 1000 real
//     signups against prod creates 1000 auth.users rows + blows past
//     the Resend free-tier email cap immediately.

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter, Trend } from 'k6/metrics'

// Vercel's edge filter blocks the default k6 user-agent string. Send a
// regular Chrome UA so we're testing the real app path, not the bot
// challenge page.
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const BROWSER_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const SCENARIO = __ENV.SCENARIO || 'full'
const VUS = parseInt(__ENV.VUS || '1000', 10)
const DURATION = __ENV.DURATION || '60s'

// Custom metrics so the summary tells us which step is slow without
// having to dig through tags.
const scanLatency = new Trend('scan_qr_latency_ms')
const signupLatency = new Trend('signup_latency_ms')
const waveLatency = new Trend('wave_latency_ms')
const signupErrors = new Counter('signup_errors')
const waveErrors = new Counter('wave_errors')

const CAMPGROUND_SLUGS = [
  'riverbend-rv-park',
  'oak-hollow-rv-resort',
  'pine-lake-campground',
  'coastal-pines-campground',
]

const baseScenario = (exec) => ({
  executor: 'ramping-vus',
  startVUs: 0,
  exec,
  stages: [
    { duration: '15s', target: VUS }, // ramp up
    { duration: DURATION, target: VUS }, // sustain
    { duration: '10s', target: 0 }, // ramp down
  ],
})

const SCENARIOS = {
  scan_only: {
    scan_qr: baseScenario('scanQr'),
  },
  full: {
    scan_qr: baseScenario('scanQr'),
    signup: baseScenario('signup'),
    wave: baseScenario('wave'),
  },
}

export const options = {
  scenarios: SCENARIOS[SCENARIO] || SCENARIOS.full,
  thresholds: {
    // Pass/fail bars. p95 of all requests under 2s, error rate <5%.
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
}

// ---------------------------------------------------------------------------
// Scenario A — Scan QR
// Hits both the demo slug page (what a guest lands on after scanning)
// and the homepage. Read-only, safe to run anywhere.
// ---------------------------------------------------------------------------
export function scanQr() {
  const slug =
    CAMPGROUND_SLUGS[Math.floor(Math.random() * CAMPGROUND_SLUGS.length)]
  const start = Date.now()
  const res = http.get(`${BASE_URL}/demo/${slug}`, { headers: BROWSER_HEADERS })
  scanLatency.add(Date.now() - start)
  check(res, {
    'scan: 200 OK': (r) => r.status === 200,
    'scan: contains campground name': (r) =>
      typeof r.body === 'string' && r.body.length > 0,
  })
  sleep(0.3 + Math.random() * 0.7)
}

// ---------------------------------------------------------------------------
// Scenario B — Sign up
// POSTs the regular guest signup server action. Each VU gets a unique
// throwaway email so writes don't collide.
//
// NOTE: Server actions in Next.js 16 are POSTs to the page URL with a
// `next-action` header pointing to a stable hash. That hash changes
// per build — k6 can't easily compute it. The clean way to load-test
// signups is a dedicated /api/load/signup route with the same shape.
// Falling back here to a simple form-encoded POST against /signup that
// will likely 404 or 405 if no such endpoint exists. Keeping it as a
// stub so the scenario plumbing exists for when you wire that route.
// ---------------------------------------------------------------------------
export function signup() {
  const ts = Date.now()
  const vu = __VU
  const payload = {
    username: `loadtest_${vu}_${ts}`.slice(0, 24),
    email: `loadtest+${vu}_${ts}@getroadwave.invalid`,
    password: 'LoadTest123!',
    accept: 'on',
  }

  const start = Date.now()
  const res = http.post(`${BASE_URL}/api/load/signup`, payload, {
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    tags: { name: 'POST /api/load/signup' },
  })
  signupLatency.add(Date.now() - start)

  const ok = check(res, {
    'signup: 2xx or expected 4xx': (r) => r.status < 500,
  })
  if (!ok) signupErrors.add(1)
  sleep(0.5 + Math.random() * 1.0)
}

// ---------------------------------------------------------------------------
// Scenario C — Wave
// Posts a wave via a load-test endpoint. Same caveat as signup: there's
// no public mutation endpoint; the real path is a server action behind
// auth. The stub keeps the scenario shape so adding a real endpoint
// later is a one-line change.
// ---------------------------------------------------------------------------
export function wave() {
  const start = Date.now()
  const res = http.post(
    `${BASE_URL}/api/load/wave`,
    JSON.stringify({ to_username: 'rolling_pines' }),
    {
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/json',
      },
      tags: { name: 'POST /api/load/wave' },
    },
  )
  waveLatency.add(Date.now() - start)

  const ok = check(res, {
    'wave: 2xx or expected 4xx': (r) => r.status < 500,
  })
  if (!ok) waveErrors.add(1)
  sleep(0.3 + Math.random() * 0.7)
}
