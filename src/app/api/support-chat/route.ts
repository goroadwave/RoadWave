import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  type CamperCampgroundContext,
  getGuestSystemPrompt,
  getOwnerSystemPrompt,
  MAX_OUTPUT_TOKENS,
  MAX_USER_MESSAGES_PER_SESSION,
} from '@/lib/support/system-prompts'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Max rows to pull into Riley's context. Bulletins are ≤280 chars and
// meetups are small, so these caps keep the system prompt comfortably
// under a few KB even at the limit.
const MAX_BULLETINS_IN_CONTEXT = 5
const MAX_MEETUPS_IN_CONTEXT = 5

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
//     pathname?: string   // page Riley should tailor to — forwarded
//                         // for both audiences
//   }
//
// Auth + audience gates:
//   - Both audiences require a Supabase session.
//   - 'owner' additionally requires a campground_admins row.
//   - 'guest' has no further gate. If the camper has an active
//     check-in, we attach campground context (name, location, amenities,
//     current bulletins, upcoming meetups) to Riley's system prompt so
//     she can answer "what's happening here" with real data.
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

  // For the guest audience we also assemble per-campground context if
  // the camper has an active check-in. Riley uses this to answer
  // "what's happening here" / "what amenities does this place have" /
  // etc. with the actual data rather than generic guidance.
  let camperContext: CamperCampgroundContext | undefined
  if (audience === 'guest') {
    camperContext = await loadCamperContext(supabase, user.id)
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
      ? getGuestSystemPrompt(pathname ?? '/home', camperContext)
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

// ---------------------------------------------------------------------------

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

// Resolve the camper's active check-in → campground row → current
// bulletins + upcoming meetups, and shape them into the context the
// guest system-prompt builder expects. Returns undefined when the
// camper has no active check-in; Riley's prompt handles that branch
// by telling her she doesn't know the campground.
//
// All reads use the caller's RLS-aware client. The camper can read
// their own check_ins row (self policy) and the joined campground
// row (campgrounds is publicly readable). Bulletins and meetups have
// read policies that allow checked-in campers.
async function loadCamperContext(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<CamperCampgroundContext | undefined> {
  const nowIso = new Date().toISOString()

  const { data: checkIn } = await supabase
    .from('check_ins')
    .select('campground_id')
    .eq('profile_id', userId)
    .eq('status', 'active')
    .gt('expires_at', nowIso)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!checkIn?.campground_id) return undefined

  const campgroundId = checkIn.campground_id

  const [campgroundRes, bulletinsRes, meetupsRes] = await Promise.all([
    supabase
      .from('campgrounds')
      .select('name, city, region, amenities')
      .eq('id', campgroundId)
      .maybeSingle(),
    supabase
      .from('bulletins')
      .select('message, category, created_at, expires_at')
      .eq('campground_id', campgroundId)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(MAX_BULLETINS_IN_CONTEXT),
    supabase
      .from('meetups')
      .select('title, description, location, start_at')
      .eq('campground_id', campgroundId)
      .gte('start_at', nowIso)
      .order('start_at', { ascending: true })
      .limit(MAX_MEETUPS_IN_CONTEXT),
  ])

  if (!campgroundRes.data) return undefined

  return {
    campground: {
      name: campgroundRes.data.name,
      city: campgroundRes.data.city ?? null,
      region: campgroundRes.data.region ?? null,
      amenities: (campgroundRes.data.amenities ?? []) as string[],
    },
    bulletins: (bulletinsRes.data ?? []).map((b) => ({
      message: b.message,
      category: b.category as 'event' | 'special' | 'alert' | 'general',
      createdAt: b.created_at,
    })),
    meetups: (meetupsRes.data ?? []).map((m) => ({
      title: m.title,
      description: m.description,
      location: m.location,
      startAt: m.start_at,
    })),
  }
}
