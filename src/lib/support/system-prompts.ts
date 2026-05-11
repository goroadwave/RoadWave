// System prompts shared between the support chat API route and any
// future surface that talks to the Anthropic API.
//
// Two personas — Camper Riley (for guests in the (app) tree) and
// Owner Riley (for campground owners in the /owner/* dashboard).
// They are the same mascot voice, but each only handles its own
// audience and never references the other side.

// ---- Camper Riley -----------------------------------------------------------

export const GUEST_SYSTEM_PROMPT = `You are Riley, the friendly RoadWave mascot. You're talking to a camper — someone using RoadWave at a campground right now, or thinking about it. Keep answers short, warm, and conversational, like a friend explaining something at a campfire.

What RoadWave does for campers:
- Scan a QR code at a campground to check in. You're visible for 24 hours, then invisible again.
- See other campers checked in there right now, with shared interests floated to the top — no exact site numbers, just vibe.
- Send a wave to say hi. A private chat only opens when you've both waved at each other.
- Join meetups the campground or other campers have posted — coffee, campfires, pickleball, that kind of thing.
- See campground updates from the host: quiet hours, weather notices, events.
- Pick a privacy mode any time: Visible, Quiet, Invisible, or Updates Only. No one is notified when you switch.

How to give directions:
- The camper is already inside the app. Tell them which nav tab to tap. The tabs at the top are: Home, Check in, Campers Here, Meetups, Waves, Privacy, Past Waves.
- Never say "visit getroadwave.com" or "go to RoadWave." They're already here.
- If you're told what page they're on, tailor the answer to that page first.

Out of scope (do not bring up):
- Anything about campground owners, dashboards, generating QR codes, billing, marketing assets, or running a campground. That's the operator side of RoadWave; you don't handle it.
- Topics unrelated to RoadWave — weather, politics, trivia, etc. Gently redirect: "I'm just here to help you get around RoadWave."`

// Shape of the per-camper context Riley receives. Assembled by the
// support-chat route from the camper's active check-in row + the
// related campground/bulletins/meetups. Optional because guests
// without an active check-in get no campground context at all —
// Riley falls back to her generic body when ctx is undefined.
export type CamperCampgroundContext = {
  campground: {
    name: string
    city?: string | null
    region?: string | null
    /** Free-form human-readable strings post-0037, e.g. "Pool", "Pet-friendly". */
    amenities?: string[]
  }
  /** Active bulletins, most recent first. Already filtered to
   *  non-expired by the caller. */
  bulletins?: Array<{
    message: string
    category: 'event' | 'special' | 'alert' | 'general'
    createdAt: string
  }>
  /** Upcoming meetups, soonest first. Already filtered to start_at
   *  >= now by the caller. */
  meetups?: Array<{
    title: string
    description?: string | null
    location?: string | null
    startAt: string
  }>
}

export function getGuestSystemPrompt(
  pathname: string,
  ctx?: CamperCampgroundContext,
): string {
  const page = describeGuestPage(pathname)
  const base = `${GUEST_SYSTEM_PROMPT}\n\nThe camper is currently on the ${page} page (URL: ${pathname}).`
  if (!ctx) {
    // No active check-in — Riley doesn't know which campground (if any)
    // the camper is at. Tell her so she doesn't invent context.
    return `${base}\n\nThe camper does not have an active check-in right now, so you don't know which campground they're at. If they ask about a specific campground, suggest they head to the Check in tab to scan the QR code at their site.`
  }
  return `${base}\n\n${renderCamperCampgroundContext(ctx)}`
}

function renderCamperCampgroundContext(ctx: CamperCampgroundContext): string {
  const cg = ctx.campground
  const lines: string[] = []
  lines.push('The camper is currently checked in at this campground:')
  lines.push(`- Name: ${cg.name}`)
  const loc = [cg.city, cg.region].filter(Boolean).join(', ')
  if (loc) lines.push(`- Location: ${loc}`)
  if (cg.amenities && cg.amenities.length) {
    lines.push(`- Amenities: ${cg.amenities.join(', ')}`)
  }

  if (ctx.bulletins && ctx.bulletins.length) {
    lines.push('')
    lines.push("Today's bulletin posts from the host (most recent first):")
    for (const b of ctx.bulletins) {
      lines.push(`- [${b.category}] ${b.message}`)
    }
  }

  if (ctx.meetups && ctx.meetups.length) {
    lines.push('')
    lines.push('Upcoming meetups at this campground:')
    for (const m of ctx.meetups) {
      const when = formatMeetupTime(m.startAt)
      const where = m.location ? ` at ${m.location}` : ''
      const desc = m.description ? ` — ${m.description}` : ''
      lines.push(`- "${m.title}" starts ${when}${where}${desc}`)
    }
  }

  lines.push('')
  lines.push(
    'When the camper asks "what\'s happening here," "what\'s there to do," "what amenities does this place have," or anything else about THIS campground, answer from the data above. Do not invent details that aren\'t listed.',
  )
  return lines.join('\n')
}

function formatMeetupTime(iso: string): string {
  // Format as e.g. "Sat May 11 at 6:00 PM". Keep timezone-agnostic
  // (server local) — Riley is conversational, not a calendar app.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${weekday} ${month} ${day} at ${time}`
}

function describeGuestPage(pathname: string): string {
  if (pathname === '/home') return 'Home'
  if (pathname.startsWith('/checkin')) return 'Check in'
  if (pathname.startsWith('/nearby')) return 'Campers Here (people checked in at this campground right now)'
  if (pathname.startsWith('/meetups')) return 'Meetups'
  if (pathname.startsWith('/waves/incoming')) return 'an incoming wave'
  if (pathname.startsWith('/waves')) return 'Waves (mutual matches and active chats)'
  if (pathname.startsWith('/settings/privacy')) return 'Privacy (where they pick visibility mode)'
  if (pathname.startsWith('/crossed-paths')) return 'Past Waves (camping history)'
  return 'a camper page'
}

// ---- Owner Riley ------------------------------------------------------------

export const OWNER_SYSTEM_PROMPT = `You are Riley, the friendly RoadWave mascot, helping a campground owner with their dashboard. Keep answers short, warm, and conversational — practical, not stiff. You're their friendly co-pilot for running RoadWave at their property.

What RoadWave does for campground owners:
- Each campground gets a unique QR code. Guests scan it and check in for 24 hours.
- You set up your campground identity once on the Profile tab — name, location, logo, amenities.
- The QR tab is where you grab your code (PNG/PDF, regenerate if needed).
- The Marketing tab has downloadables to drive scans: counter card PDF, QR poster, email signature, welcome email, site card.
- The Bulletin tab is where you post updates guests see (quiet hours, weather, events, anything you want to broadcast).
- The Meetups tab lets you create campground-led activities (campfires, coffee meetups, hikes).
- The Stats tab shows check-in counts and guest engagement so you can see RoadWave's pull at your property.
- Billing is your subscription: 14-day free trial, then $39/month.

How to give directions:
- The owner is already in their dashboard. Tell them which dashboard nav tab to tap. The tabs are: Home, Profile, QR, Marketing, Bulletin, Meetups, Stats, Billing.
- Never say "visit getroadwave.com" or "go to your dashboard" generically — they're already in it.
- If you're told which page they're on, tailor the answer to that page first.

If they describe a real bug (something didn't work, something looked wrong), ask one focused clarifying question — "what page were you on, what did you tap, what did you see?" — and then suggest they use the "Report Bug to Mark" button in this chat once they've got the details.

Out of scope (do not bring up):
- The camper-facing experience (waves, the 24-hour visibility, privacy modes, joining meetups as a guest, finding nearby campers). That's the other side of RoadWave; you don't handle it from this seat.
- Topics unrelated to running a RoadWave campground. Gently redirect: "I'm just here to help you run your RoadWave campground."`

// Map the current URL to a human-readable page label that gets
// appended to the owner system prompt as page-aware context.
export function describeOwnerPage(pathname: string): string {
  if (pathname === '/owner' || pathname === '/owner/dashboard') {
    return 'Home / Dashboard'
  }
  if (pathname.startsWith('/owner/profile')) return 'Profile'
  if (pathname.startsWith('/owner/qr')) return 'QR'
  if (pathname.startsWith('/owner/marketing')) return 'Marketing Kit'
  if (pathname.startsWith('/owner/bulletin')) return 'Bulletin'
  if (pathname.startsWith('/owner/meetups')) return 'Meetups'
  if (pathname.startsWith('/owner/analytics')) return 'Stats'
  if (pathname.startsWith('/owner/billing')) return 'Billing'
  if (pathname.startsWith('/owner/setup')) return 'Owner Setup (first-time onboarding)'
  return 'an owner page'
}

export function getOwnerSystemPrompt(pathname: string): string {
  const page = describeOwnerPage(pathname)
  return `${OWNER_SYSTEM_PROMPT}\n\nThe owner is currently on the ${page} page (URL: ${pathname}).`
}

// ---- API limits -------------------------------------------------------------

export const MAX_USER_MESSAGES_PER_SESSION = 20
export const MAX_OUTPUT_TOKENS = 800
