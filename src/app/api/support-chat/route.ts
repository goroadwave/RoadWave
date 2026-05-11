import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getGuestSystemPrompt,
  getOwnerSystemPrompt,
  MAX_OUTPUT_TOKENS,
  MAX_USER_MESSAGES_PER_SESSION,
} from '@/lib/support/system-prompts'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// POST /api/support-chat
//
// Server-side relay to the Anthropic API for the floating chat widgets
// at /owner/* (owner audience) and /(app)/* (guest audience). The
// Anthropic API key never leaves the server.
//
// Body:
//   {
//     audience: 'guest' | 'owner',
//     messages: [{ role: 'user' | 'assistant', content: string }, …],
//     pathname?: string   // owner only — used for page-aware context
//   }
//
// Auth + audience gates:
//   - Both audiences require a Supabase session.
//   - 'guest' additionally requires an active, non-expired check-in.
//   - 'owner' additionally requires a campground_admins row.
//
// Rate limit:
//   - Server rejects when user-message count exceeds 20 per session.
//     Client also enforces this; the server check is the trustworthy one.

const requestSchema = z.object({
  audience: z.enum(['guest', 'owner']),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(MAX_USER_MESSAGES_PER_SESSION * 2 + 2),
  pathname: z.string().optional(),
})

const MODEL = 'claude-sonnet-4-6'

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { audience, messages, pathname } = parsed.data

  // Last message must be from the user — we're sending the chat to the
  // assistant for a reply.
  const last = messages[messages.length - 1]
  if (last.role !== 'user') {
    return NextResponse.json(
      { error: 'Last message must be a user message.' },
      { status: 400 },
    )
  }

  // Hard rate limit on user-message count.
  const userMsgCount = messages.filter((m) => m.role === 'user').length
  if (userMsgCount > MAX_USER_MESSAGES_PER_SESSION) {
    return NextResponse.json(
      {
        error: `Session limit reached (${MAX_USER_MESSAGES_PER_SESSION} messages). Refresh to start a new chat.`,
      },
      { status: 429 },
    )
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (audience === 'guest') {
    // Riley (the guest-facing chat) is available to any signed-in user,
    // regardless of whether they've checked in to a campground yet.
    // The previous active-check-in gate has been removed so prospective
    // and pre-check-in users can ask Riley how RoadWave works.
  } else {
    const { data: link } = await supabase
      .from('campground_admins')
      .select('campground_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    if (!link) {
      return NextResponse.json(
        { error: 'Not an owner.' },
        { status: 403 },
      )
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[support-chat] ANTHROPIC_API_KEY not set')
    return NextResponse.json(
      { error: 'Support chat is temporarily unavailable.' },
      { status: 503 },
    )
  }

  const systemPrompt =
    audience === 'guest'
      ? getGuestSystemPrompt(pathname ?? '/home')
      : getOwnerSystemPrompt(pathname ?? '/owner/dashboard')

  try {
    const client = new Anthropic({ apiKey })
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const text = result.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return NextResponse.json({ content: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[support-chat] anthropic call failed:', msg)
    return NextResponse.json(
      { error: 'AI temporarily unavailable. Please try again.' },
      { status: 502 },
    )
  }
}
