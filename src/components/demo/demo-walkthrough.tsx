'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Phase 4 of the RoadWave Demo Center -- a self-guided, step-by-step
// product tour at /demo-center/walkthrough. It exists so a campground
// owner can understand the whole RoadWave flow on their own, without
// Mark narrating it live.
//
// The tour is a single client component: a linear stepper over four
// chapters (owner setup -> owner dashboard -> camper QR experience ->
// optional Camper Connections). Each step pairs a short, owner-facing
// explanation with a small static "screenshot" mock built from the
// primitives at the bottom of this file.
//
// SAFETY: 100% static mock data. No DB, no API, no auth, no Stripe,
// no emails, no real customer data. Nothing here writes anywhere.
// The interactive camper/owner demos (/demo-center/camper and
// /demo-center/owner) stay untouched; this page links out to them.

// ---------------------------------------------------------------
// Chapter + step model
// ---------------------------------------------------------------

const CHAPTERS = [
  {
    id: 'setup',
    label: '1 · Setup',
    short: 'Owner setup',
    demoHref: '/demo-center/owner',
    demoLabel: 'See setup in the owner demo',
  },
  {
    id: 'dashboard',
    label: '2 · Dashboard',
    short: 'Owner dashboard',
    demoHref: '/demo-center/owner',
    demoLabel: 'Open the interactive owner demo',
  },
  {
    id: 'camper',
    label: '3 · Camper QR',
    short: 'Camper QR experience',
    demoHref: '/demo-center/camper',
    demoLabel: 'Open the interactive camper demo',
  },
  {
    id: 'connections',
    label: '4 · Connections',
    short: 'Camper Connections',
    demoHref: '/demo-center/camper',
    demoLabel: 'Try Camper Connections in the camper demo',
  },
] as const

type Step = {
  chapter: number
  eyebrow: string
  title: string
  body: string
  visual: React.ReactNode
}

const STEPS: Step[] = [
  // ----- Chapter 1: Owner setup -----
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Name your campground',
    body: 'Start by naming your campground. It headlines every guest’s screen and prints on your QR card, so guests instantly know they’re in the right place.',
    visual: (
      <Frame label="Owner · profile">
        <Field label="Campground name" value="Pine Ridge RV Resort" />
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Add your logo & brand',
    body: 'Add your logo and brand color. RoadWave carries them across the guest page and the printable QR card so everything looks like your park, not a generic app.',
    visual: (
      <Frame label="Owner · profile">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-flame/40 bg-flame/20 text-base">
            🏕️
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-cream">Pine Ridge RV Resort</p>
            <p className="text-[9px] text-mist">Logo + brand color set</p>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Address & office phone',
    body: 'Enter your address and office phone. Guests get a one-tap call button and clear directions — fewer “where’s the office?” knocks.',
    visual: (
      <Frame label="Owner · profile">
        <Field label="Address" value="1247 Lakeshore Dr · Pine Ridge, CO" />
        <Field label="Office phone" value="(555) 234-9876" />
        <FakeBtn>📞 Call office</FakeBtn>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Guest Wi-Fi',
    body: 'Set your guest Wi-Fi network and password once. Guests copy it in a tap instead of squinting at a laminated card in the office.',
    visual: (
      <Frame label="Owner · profile">
        <Field label="Network" value="PineRidge-Guest" />
        <Field label="Password" value="pinecone2026" />
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Park map',
    body: 'Upload your park map. Guests find their site, the bathhouse, the pool, and evacuation routes without flagging you down.',
    visual: (
      <Frame label="Owner · profile">
        <div className="grid aspect-[16/9] place-items-center rounded-md border border-white/10 bg-white/[0.03] text-xl">
          🗺️
        </div>
        <p className="text-[9px] text-mist">map.png · uploaded</p>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Amenities',
    body: 'Check off your amenities — pool hours, dog park, laundry, camp store. Guests see exactly what’s available and when.',
    visual: (
      <Frame label="Owner · profile">
        <div className="flex flex-wrap gap-1.5">
          <Chip>☕ Coffee bar</Chip>
          <Chip>🏊 Pool</Chip>
          <Chip>🐕 Dog park</Chip>
          <Chip>🧺 Laundry</Chip>
          <Chip>🛒 Camp store</Chip>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Rules & quiet hours',
    body: 'Add your rules and quiet hours. Setting expectations up front means calmer evenings and fewer reminder conversations.',
    visual: (
      <Frame label="Owner · profile">
        <RuleLine>Quiet hours 10 PM – 7 AM</RuleLine>
        <RuleLine>Speed limit 10 MPH in the park</RuleLine>
        <RuleLine>Pets leashed outside the dog park</RuleLine>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Check-in & checkout times',
    body: 'Set check-in and checkout times. They stay visible to guests, cutting down on early-arrival and late-stay confusion.',
    visual: (
      <Frame label="Owner · profile">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Check in" value="2:00 PM" />
          <Field label="Check out" value="11:00 AM" />
        </div>
      </Frame>
    ),
  },
  {
    chapter: 0,
    eyebrow: 'Owner setup',
    title: 'Review & Book Again links',
    body: 'Drop in your Google review link and your rebooking link. These power the “Leave a Review” and “Book Again” buttons guests tap at the end of a great stay.',
    visual: (
      <Frame label="Owner · profile">
        <ToggleRow label="Google review link" />
        <ToggleRow label="Book Again link" />
      </Frame>
    ),
  },

  // ----- Chapter 2: Owner dashboard actions -----
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Post a bulletin',
    body: 'From your dashboard, post a bulletin in seconds — pool hours, a food truck, a reminder. It appears on every guest’s QR page and pings their Lantern.',
    visual: (
      <Frame label="Owner · dashboard">
        <MockTextarea text="Taco truck by the clubhouse, 5–8 PM tonight." />
        <FakeBtn>Post bulletin</FakeBtn>
        <MiniNote>✓ Posted · guests notified</MiniNote>
      </Frame>
    ),
  },
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Create a meetup',
    body: 'Create a meetup — coffee, a sunset walk, a campfire. Add a time and place and it shows up in the guests’ “Happening” list.',
    visual: (
      <Frame label="Owner · dashboard">
        <Field label="Title" value="Sunset campfire" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Location" value="Fire ring 3" />
          <Field label="Starts" value="Tonight · 9 PM" />
        </div>
        <FakeBtn>Post meetup</FakeBtn>
      </Frame>
    ),
  },
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Post a Weather & Safety notice',
    body: 'Post a Weather & Safety notice when it matters. It pins a red card to the top of every guest’s screen and fires a dedicated alert. (Not a 911 system — owner-posted info only.)',
    visual: (
      <Frame label="Owner · dashboard">
        <MockTextarea text="Strong storms 7–10 PM. Secure awnings; clubhouse open as shelter." danger />
        <FakeBtn tone="danger">Post Weather &amp; Safety notice</FakeBtn>
      </Frame>
    ),
  },
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Read & reply to office messages',
    body: 'Guests message the office through the QR page. You read, reply, and mark each one resolved or archived — all from one inbox. Nothing is ever hard-deleted.',
    visual: (
      <Frame label="Owner · inbox">
        <Bubble who="Site 24 · Lisa">Our Wi-Fi password isn’t working.</Bubble>
        <Bubble who="You · Park Office" side="right">
          On it — sending a fresh code now.
        </Bubble>
        <div className="flex gap-1.5">
          <FakeBtn tone="leaf">✓ Resolved</FakeBtn>
          <FakeBtn tone="ghost">Archive</FakeBtn>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Review & rebooking tools',
    body: 'Toggle the Google review and Book Again prompts on or off. When they’re on, happy guests get a friendly nudge at exactly the right moment.',
    visual: (
      <Frame label="Owner · dashboard">
        <ToggleRow label="Show Google review link" />
        <ToggleRow label="Show Book Again link" />
      </Frame>
    ),
  },
  {
    chapter: 1,
    eyebrow: 'Owner dashboard',
    title: 'Camper Connections at a glance',
    body: 'See high-level Camper Connections activity — opt-ins, Waves, matches. You get the pulse of the social side without ever reading private guest messages.',
    visual: (
      <Frame label="Owner · dashboard">
        <div className="grid grid-cols-3 gap-2">
          <Tile k="Visible now" v="18" />
          <Tile k="Waves (7d)" v="31" />
          <Tile k="Matches (7d)" v="12" />
        </div>
      </Frame>
    ),
  },

  // ----- Chapter 3: Camper QR experience -----
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'A guest scans the QR code',
    body: 'It starts when a guest scans the QR card you printed and posted. No app download, and no account needed to see your info.',
    visual: (
      <Frame label="Camper · phone">
        <div className="grid place-items-center gap-2 py-1">
          <span className="grid h-16 w-16 place-items-center rounded-lg bg-cream/95 text-3xl">
            ⏹️
          </span>
          <p className="text-[9px] font-mono text-mist">getroadwave.com/p/pine-ridge</p>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'They see your campground',
    body: 'First they see your campground — name, address, and a one-tap call button. Instant orientation the moment they arrive.',
    visual: (
      <Frame label="Camper · phone">
        <p className="text-[13px] font-extrabold text-cream">Pine Ridge RV Resort</p>
        <p className="text-[9px] text-mist">1247 Lakeshore Dr · Pine Ridge, CO</p>
        <FakeBtn tone="ghost">📞 Call office: (555) 234-9876</FakeBtn>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'Wi-Fi, map, rules & amenities',
    body: 'Wi-Fi, the park map, rules, and amenities are all right there. The questions guests usually walk to the office for are answered on their phone.',
    visual: (
      <Frame label="Camper · phone">
        <MiniCard eyebrow="Wi-Fi">
          <p className="font-mono text-[11px] text-cream">PineRidge-Guest</p>
          <p className="font-mono text-[11px] text-cream">pinecone2026</p>
        </MiniCard>
        <div className="flex flex-wrap gap-1.5">
          <Chip>🗺️ Map</Chip>
          <Chip>📋 Rules</Chip>
          <Chip>🏊 Pool</Chip>
          <Chip>🐕 Dog park</Chip>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'Your bulletins',
    body: 'Your bulletins show up in a clean feed, newest first — so the food-truck-tonight note actually reaches people.',
    visual: (
      <Frame label="Camper · phone">
        <MiniCard eyebrow="Bulletins">
          <p className="text-[11px] text-cream">Taco truck by the clubhouse, 5–8 PM.</p>
          <p className="mt-1 text-[11px] text-cream/80">Pool open until 10 PM Fri/Sat.</p>
        </MiniCard>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'Your meetups',
    body: 'Your meetups appear under “Happening at the campground,” with time and place, so guests can join in.',
    visual: (
      <Frame label="Camper · phone">
        <MiniCard eyebrow="Happening">
          <p className="text-[11px] font-semibold text-cream">Coffee at the pavilion</p>
          <p className="text-[9px] text-flame">Tomorrow · 9:00 AM</p>
        </MiniCard>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'A Weather & Safety alert',
    body: 'If you’ve posted a Weather & Safety notice, it sits at the very top in red — impossible to miss.',
    visual: (
      <Frame label="Camper · phone">
        <div className="rounded-md border border-red-500/40 bg-red-500/[0.08] p-2.5">
          <p className="text-[8px] uppercase tracking-wider font-semibold text-red-300">
            ⛈️ Weather &amp; Safety
          </p>
          <p className="mt-0.5 text-[11px] font-bold text-cream">Severe Weather Notice</p>
          <p className="text-[10px] text-cream/90">Storms 7–10 PM. Clubhouse open as shelter.</p>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'Message the office',
    body: 'Need help? A guest picks a category, types a note, and sends it straight to your office — no phone tag.',
    visual: (
      <Frame label="Camper · phone">
        <Field label="Category" value="Wi-Fi help" />
        <MockTextarea text="Site 12 — Wi-Fi keeps dropping." />
        <FakeBtn>Send to office</FakeBtn>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'They get your reply',
    body: 'Your reply lands right in their thread. They see “Park Office” responded, and the conversation stays in one place.',
    visual: (
      <Frame label="Camper · phone">
        <Bubble who="You" side="right">
          Wi-Fi keeps dropping at site 12.
        </Bubble>
        <Bubble who="Park Office">Thanks! Rebooting the node now — try again in 5.</Bubble>
      </Frame>
    ),
  },
  {
    chapter: 2,
    eyebrow: 'Camper experience',
    title: 'Feedback, reviews & rebooking',
    body: 'Mid-stay, guests can give quick feedback. Loving it? One tap leaves a Google review or rebooks for next time.',
    visual: (
      <Frame label="Camper · phone">
        <div className="flex flex-wrap gap-1.5">
          <Chip>😄 Great</Chip>
          <Chip>🙂 Good</Chip>
          <Chip>🛠️ Needs attention</Chip>
        </div>
        <div className="flex gap-1.5">
          <FakeBtn>⭐ Leave a Review</FakeBtn>
          <FakeBtn tone="ghost">📅 Book Again</FakeBtn>
        </div>
      </Frame>
    ),
  },

  // ----- Chapter 4: Optional Camper Connections -----
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'A guest chooses to join',
    body: 'Camper Connections is fully optional. A guest chooses whether to join — your campground info works with or without it.',
    visual: (
      <Frame label="Camper · phone">
        <MiniCard eyebrow="Optional · Camper Connections">
          <p className="text-[11px] font-semibold text-cream">Want to meet other campers here?</p>
          <div className="mt-1.5">
            <FakeBtn>Join Camper Connections</FakeBtn>
          </div>
        </MiniCard>
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'They pick interests & visibility',
    body: 'If they join, they pick a few interests and set their visibility. They’re in control of what’s shared — and no exact site numbers, ever.',
    visual: (
      <Frame label="Camper · phone">
        <div className="flex flex-wrap gap-1.5">
          <Chip>☕ Coffee</Chip>
          <Chip>🔥 Campfires</Chip>
          <Chip>🐕 Dog walks</Chip>
        </div>
        <ToggleRow label="Visible to other campers" />
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'They see other campers',
    body: 'Opted-in guests see other campers nearby with similar interests — families, dog walkers, fellow full-timers.',
    visual: (
      <Frame label="Camper · phone">
        <CamperRow name="Lisa & Tom" tag="Full-timers · Class A" />
        <CamperRow name="Mike" tag="Solo · truck camper" />
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'They send a Wave',
    body: 'To say hello, a guest sends a Wave. It’s a low-key, no-pressure first move.',
    visual: (
      <Frame label="Camper · phone">
        <CamperRow name="Lisa & Tom" tag="Full-timers · Class A" action={<FakeBtn>👋 Send Wave</FakeBtn>} />
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'The other camper waves back',
    body: 'If the other camper Waves back, it becomes a mutual match — both opted in, both interested.',
    visual: (
      <Frame label="Camper · phone">
        <CamperRow
          name="Lisa & Tom"
          tag="Full-timers · Class A"
          action={<FakeBtn tone="leaf">Matched 🎉</FakeBtn>}
        />
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'A match unlocks messaging',
    body: 'A match unlocks simple messaging with a few friendly openers. No public group chat, and no owner eavesdropping.',
    visual: (
      <Frame label="Camper · phone">
        <div className="flex flex-wrap gap-1.5">
          <Chip>Want to meet for coffee?</Chip>
          <Chip>Heading to the campfire later?</Chip>
        </div>
      </Frame>
    ),
  },
  {
    chapter: 3,
    eyebrow: 'Camper Connections · optional',
    title: 'It saves to Past Waves',
    body: 'The connection saves to “Past Waves,” so guests can keep chatting even after they leave your park — a reason to come back.',
    visual: (
      <Frame label="Camper · phone">
        <MiniCard eyebrow="Past Waves">
          <p className="text-[11px] text-cream">Lisa &amp; Tom · Pine Ridge RV Resort</p>
          <p className="text-[9px] text-mist">Keep messaging after checkout</p>
        </MiniCard>
      </Frame>
    ),
  },
]

// ---------------------------------------------------------------
// Root component
// ---------------------------------------------------------------

export function DemoWalkthrough() {
  const [i, setI] = useState(0)
  const total = STEPS.length
  const step = STEPS[i]
  const chapter = CHAPTERS[step.chapter]
  const atStart = i === 0
  const atEnd = i === total - 1

  const next = () => setI((p) => Math.min(total - 1, p + 1))
  const back = () => setI((p) => Math.max(0, p - 1))
  const chapterStart = (c: number) => STEPS.findIndex((s) => s.chapter === c)

  // Left/right arrow keys advance the tour. Ignore when the user is
  // typing in a field (there are none here, but it's cheap insurance).
  // Uses setI updaters directly so the listener has no changing deps.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') setI((p) => Math.min(STEPS.length - 1, p + 1))
      if (e.key === 'ArrowLeft') setI((p) => Math.max(0, p - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      {/* Scoped, reduced-motion-respecting step transition. */}
      <style>{`@media (prefers-reduced-motion: no-preference){.rw-step{animation:rw-fade .28s ease both}}@keyframes rw-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      <header className="max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.25em] text-flame font-semibold">
          Guided walkthrough
        </p>
        <h1 className="mt-2 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-cream">
          The whole RoadWave flow, step by step
        </h1>
        <p className="mt-3 text-sm sm:text-base text-mist leading-relaxed">
          A self-guided tour for campground owners — setup, your dashboard, what
          guests see after scanning the QR code, and the optional Camper
          Connections. Everything here is demo data; nothing is saved.
        </p>
      </header>

      {/* Chapter tabs */}
      <nav aria-label="Walkthrough chapters" className="mt-6 flex flex-wrap gap-1.5">
        {CHAPTERS.map((c, idx) => {
          const active = step.chapter === idx
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setI(chapterStart(idx))}
              aria-current={active ? 'step' : undefined}
              className={
                active
                  ? 'rounded-full border border-flame/50 bg-flame/15 px-3 py-1.5 text-xs font-semibold text-flame'
                  : 'rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-mist transition-colors hover:border-white/20 hover:text-cream'
              }
            >
              {c.label}
            </button>
          )
        })}
      </nav>

      {/* Progress */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-[11px] text-mist">
          <span>
            Chapter {step.chapter + 1} of {CHAPTERS.length} · {chapter.short}
          </span>
          <span className="tabular-nums">
            Step {i + 1} of {total}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-flame transition-all duration-300"
            style={{ width: `${((i + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step card — keyed so each step remounts + animates in */}
      <section
        key={i}
        className="rw-step mt-6 rounded-2xl border border-white/5 bg-card p-5 shadow-lg shadow-black/20 sm:p-6"
      >
        <div className="grid gap-5 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
              {step.eyebrow}
            </p>
            <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-extrabold leading-tight text-cream">
              {step.title}
            </h2>
            <p className="mt-3 text-sm text-mist leading-relaxed">{step.body}</p>
            <Link
              href={chapter.demoHref}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-flame underline-offset-2 hover:underline"
            >
              {chapter.demoLabel} →
            </Link>
          </div>
          <div className="min-w-0">{step.visual}</div>
        </div>
      </section>

      {/* Controls */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={atStart}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-cream transition-colors hover:border-white/20 disabled:opacity-40"
        >
          ← Back
        </button>
        <span className="hidden text-[11px] text-mist sm:block">
          {atEnd ? (
            <span className="font-semibold text-leaf">
              🎉 That’s the whole flow — you’re ready.
            </span>
          ) : (
            'Use ← → keys or the tabs above'
          )}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={atEnd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-flame px-5 py-2 text-sm font-semibold text-night shadow-md shadow-flame/15 transition-colors hover:bg-amber-400 disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {/* Try it yourself */}
      <div className="mt-10 rounded-2xl border border-white/5 bg-card p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          Try it yourself
        </p>
        <h2 className="mt-1 font-display text-lg font-extrabold text-cream">
          See the real thing
        </h2>
        <p className="mt-1.5 text-sm text-mist leading-relaxed">
          Open the interactive demos and click around — same mock data, fully
          hands-on.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link
            href="/demo-center/camper"
            className="rounded-lg border border-flame/40 bg-flame/10 px-4 py-2 text-sm font-semibold text-flame transition-colors hover:bg-flame/15"
          >
            📱 Open camper demo
          </Link>
          <Link
            href="/demo-center/owner"
            className="rounded-lg border border-flame/40 bg-flame/10 px-4 py-2 text-sm font-semibold text-flame transition-colors hover:bg-flame/15"
          >
            🧭 Open owner demo
          </Link>
          <Link
            href="/owner/signup"
            className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest/90"
          >
            🚀 Start 30-day trial
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------
// Tiny static mock primitives (no state, render-only "screenshots")
// ---------------------------------------------------------------

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-night/50 p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-flame/60" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="h-2 w-2 rounded-full bg-white/15" />
        <span className="ml-1.5 text-[8px] uppercase tracking-[0.15em] text-mist/70">
          {label}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[8px] uppercase tracking-wider font-semibold text-mist">{label}</p>
      <p className="text-[11px] font-medium text-cream">{value}</p>
    </div>
  )
}

function MiniCard({
  eyebrow,
  children,
}: {
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
      {eyebrow && (
        <p className="mb-1 text-[8px] uppercase tracking-wider font-semibold text-flame">
          {eyebrow}
        </p>
      )}
      {children}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream">
      {children}
    </span>
  )
}

function FakeBtn({
  children,
  tone = 'flame',
}: {
  children: React.ReactNode
  tone?: 'flame' | 'ghost' | 'danger' | 'leaf'
}) {
  const cls =
    tone === 'flame'
      ? 'bg-flame text-night'
      : tone === 'danger'
        ? 'bg-red-500 text-night'
        : tone === 'leaf'
          ? 'border border-leaf/40 bg-leaf/15 text-leaf'
          : 'border border-white/15 bg-white/5 text-cream'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-semibold ${cls}`}
    >
      {children}
    </span>
  )
}

function Bubble({
  who,
  side = 'left',
  children,
}: {
  who: string
  side?: 'left' | 'right'
  children: React.ReactNode
}) {
  return (
    <div
      className={
        side === 'right'
          ? 'ml-auto max-w-[88%] rounded-md border border-flame/30 bg-flame/10 px-2.5 py-1.5'
          : 'mr-auto max-w-[88%] rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5'
      }
    >
      <p className="text-[8px] uppercase tracking-wider text-mist">{who}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-cream">{children}</p>
    </div>
  )
}

function MockTextarea({ text, danger }: { text: string; danger?: boolean }) {
  return (
    <div
      className={`rounded-md border bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-cream/90 ${
        danger ? 'border-red-500/40' : 'border-white/10'
      }`}
    >
      {text}
    </div>
  )
}

function MiniNote({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-leaf">{children}</p>
}

function RuleLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-cream">
      <span aria-hidden className="text-flame">
        ·
      </span>
      {children}
    </p>
  )
}

function ToggleRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[11px] text-cream">{label}</p>
      <span className="inline-flex items-center rounded-full border border-leaf/40 bg-leaf/15 px-2 py-0.5 text-[9px] font-semibold text-leaf">
        ✓ On
      </span>
    </div>
  )
}

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
      <p className="text-[15px] font-extrabold leading-none text-cream tabular-nums">{v}</p>
      <p className="mt-0.5 text-[8px] leading-tight text-mist">{k}</p>
    </div>
  )
}

function CamperRow({
  name,
  tag,
  action,
}: {
  name: string
  tag: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-cream">{name}</p>
        <p className="text-[9px] text-mist">{tag}</p>
      </div>
      {action}
    </div>
  )
}
