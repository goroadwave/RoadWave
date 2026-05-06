#!/usr/bin/env node
//
// Smoke test for /api/support-chat in production. Three checks:
//
//   1. Anonymous POST to /api/support-chat → 401
//      (Supabase auth gate present + working)
//
//   2. POST with a malformed body → 400
//      (zod validation working)
//
//   3. Direct call to claude-sonnet-4-6 with the active key
//      (the same key the production env var holds — proves the key
//      Anthropic accepts is alive and the model is reachable. The
//      env var being set in Vercel was already verified via
//      `vercel env ls`; this validates the value itself.)
//
// The end-to-end "authed owner gets a real response" path needs a
// browser session with Supabase cookies set, which is more
// orchestration than a smoke test wants. The three checks here cover
// the wiring: auth gate, schema, key validity. A real owner clicking
// the widget exercises the union.

import Anthropic from '@anthropic-ai/sdk'

const SITE = 'https://www.getroadwave.com'
const KEY = process.argv[2]

if (!KEY) {
  console.error(
    'Usage: node scripts/smoke-test-support-chat.mjs <ANTHROPIC_API_KEY>',
  )
  console.error(
    '       (paste the same key that\'s set in Vercel production env)',
  )
  process.exit(1)
}

let pass = true
function check(label, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? '  — ' + detail : ''}`)
  if (!ok) pass = false
}

// ---- 1. Anonymous → 401 ----
console.log('\n=== 1. Anonymous probe ===')
{
  const res = await fetch(`${SITE}/api/support-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience: 'owner',
      messages: [{ role: 'user', content: 'hello' }],
    }),
  })
  check(
    'POST without auth cookie → 401',
    res.status === 401,
    `got ${res.status}`,
  )
}

// ---- 2. Malformed body → 400 ----
console.log('\n=== 2. Schema validation ===')
{
  const res = await fetch(`${SITE}/api/support-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience: 'sysadmin', // not in the enum
      messages: [],
    }),
  })
  check(
    'POST with bad audience enum → 400',
    res.status === 400,
    `got ${res.status}`,
  )
}

// ---- 3. Direct Anthropic call ----
console.log('\n=== 3. Direct claude-sonnet-4-6 call ===')
try {
  const client = new Anthropic({ apiKey: KEY })
  const result = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: "Smoke test. Reply with just the word 'OK' and nothing else.",
      },
    ],
  })
  const text = result.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  console.log(`   model:    ${result.model}`)
  console.log(`   stop:     ${result.stop_reason}`)
  console.log(`   text:     ${JSON.stringify(text)}`)
  console.log(
    `   usage:    in=${result.usage.input_tokens} out=${result.usage.output_tokens}`,
  )
  check(
    'key is valid and model responds',
    text.length > 0 && result.stop_reason !== null,
  )
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  console.log(`   error: ${msg}`)
  check('key is valid and model responds', false, msg)
}

console.log('\n=== Result ===')
if (pass) {
  console.log(
    '✅ All wiring checks passed. The widget should work end-to-end for any user matching the audience gate.',
  )
  process.exit(0)
} else {
  console.log('❌ At least one check failed — see above.')
  process.exit(1)
}
