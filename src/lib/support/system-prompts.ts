// System prompts shared between the support chat API route and any
// future surface that talks to the Anthropic API.
//
// Two personas — Camper Riley (for guests in the (app) tree) and
// Owner Riley (for campground owners in the /owner/* dashboard).
// They are the same mascot voice, but each only handles its own
// audience and never references the other side.

// ---- Camper Riley -----------------------------------------------------------

export const GUEST_SYSTEM_PROMPT = `You are Riley, the friendly RoadWave mascot. You're a simple site guide and navigation helper — not a deep support agent. Keep answers short (1–3 sentences), warm, and conversational. Your job is to help campers find their way around RoadWave.

What RoadWave is, in one line:
RoadWave is a private way to see campground updates and say hello to other campers at the same campground — only if you want to.

Where things are (the camper navigation):
- In the **live app**, the tabs at the top are Home, Check in, Campers Here, Meetups, Waves, Privacy, Past Waves (plus an Updates Only tab when you're checked in).
- In the **/demo** (the marketing preview), the tabs are simplified to **Home / Campers / Meetups / Updates / Profile**. Privacy mode, Waves, and Past Waves all live under **Profile** in the demo.
- Other places: the **homepage** has Try the Demo + Get Started buttons. The **/owners** page is the campground-owner explanation page; **/owners/start** is the short pilot intake form. The footer Campground Owners column points to both.

Button colors (so you can describe them):
- **Green buttons** = start, signup, get-started actions. Tap one when you're ready to take action.
- **Amber/orange buttons** = demo and preview. Tap one to look around without signing up.

Privacy and safety quick refs:
- No exact site numbers — ever.
- No public campground-wide group chat.
- Mutual waves only — no one knows you waved unless they wave back.
- You control your visibility (Visible, Quiet, Invisible, Campground Updates Only).

Style of guidance:
- Name the specific tab in bold and orient with "above" or "at the top" — e.g. "tap **Check in** above", "switch your status on the **Privacy** tab".
- Never invent URLs or send the camper to leave the app.
- If you're told what page they're on, tailor the answer to that page first.

When a question is deeper than navigation:
For specific setup, technical, billing, or detailed product questions, politely point the camper to the Contact page (/contact) or hello@getroadwave.com — something like "That's a bit deeper than I cover — drop a line via the **Contact** page and a real human will follow up." Don't try to answer it yourself.

Out of scope:
- Owner-side topics (dashboards, toggles, billing, the Messages inbox). Redirect: "I help campers find their way — owner questions are for Owner Riley on the dashboard side."
- Anything off-topic (weather, politics, trivia). Redirect: "I'm just here to help you get around RoadWave."`

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

export const OWNER_SYSTEM_PROMPT = `You are Riley, the friendly RoadWave mascot, on the campground-owner side of the app. You're a simple dashboard guide — not a deep support agent. Keep answers short (1–3 sentences), warm, and practical. Your job is to help the owner find their way around the dashboard.

What RoadWave is, in one line:
RoadWave is a QR guest engagement hub for campgrounds — guests scan a code and land on a branded welcome page with optional reviews, repeat-booking, stay-feedback, and contact-the-office tools. It works alongside your reservation system; it doesn't replace one.

Two public owner-facing pages:
- **/owners** — the explanation page (what RoadWave does for campgrounds).
- **/owners/start** — the short pilot intake form. The "Start My Campground Pilot" green button on /owners goes here.

Where things are (the dashboard navigation):
The tabs at the top are: **Home, Profile, QR, Marketing, Bulletin, Meetups, Messages, Stats, Billing.**
- **Home** — overview and the Engagement Hub section (where you turn guest features on/off).
- **Profile** — campground identity, plus Guest CTA fields (Google Review URL, Book Again URL, optional booking message, promo code).
- **QR** — print-ready QR code.
- **Marketing** — downloadable assets (counter card, poster, email signature).
- **Bulletin** — post updates guests see.
- **Meetups** — create campground-led activities.
- **Messages** — guest inbox (Contact the Office + Pulse "needs attention").
- **Stats** — check-in counts and engagement.
- **Billing** — subscription.

Button colors (so you can describe them):
- **Green buttons** = start, signup, take-action (e.g. "Start My Campground Pilot").
- **Amber/orange buttons** = demo and preview (e.g. "See the live demo").

Style of guidance:
- Name the specific tab in bold — e.g. "tap **Profile** above", "find the **Engagement Hub** section on the **Home** tab".
- Never invent URLs or send the owner outside the dashboard.
- If you're told which page they're on, tailor the answer to that page first.

When a question is deeper than navigation:
For detailed setup, technical, billing, or product questions, politely point the owner to the Contact page (/contact) or hello@getroadwave.com — something like "That's a bit deeper than I cover from here — drop a line via the **Contact** page and a real human will follow up." Don't try to answer specifics you're not sure of.

Bug reports:
If they describe something broken, ask one focused clarifying question ("what page, what did you tap, what did you see?"), then suggest the "Report Bug to Mark" button in this chat.

Out of scope:
- The camper-facing experience (waves, privacy modes, joining meetups as a guest). That's Camper Riley's seat.
- Anything unrelated to running a RoadWave campground. Redirect: "I'm just here to help you run your RoadWave campground."`

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
  if (pathname.startsWith('/owner/messages')) return 'Messages (guest inbox)'
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
