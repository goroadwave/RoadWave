'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { Logo } from '@/components/ui/logo'
import { DemoLantern } from '@/components/demo/demo-lantern'

// ----------------------------------------------------------------------------
// Mock data
// ----------------------------------------------------------------------------

const TRAVEL_STYLES = [
  'Full-timer',
  'Weekender',
  'Snowbird',
  'Seasonal guest',
  'Camp host',
  'Work camper',
  'Solo traveler',
  'Traveling for work',
  'Family traveler',
  'Prefer quiet',
]

const INTERESTS = [
  { slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { slug: 'campfire', label: 'Campfire', emoji: '🔥' },
  { slug: 'dogs', label: 'Dogs', emoji: '🐕' },
  { slug: 'cats', label: 'Cats', emoji: '🐱' },
  { slug: 'hiking', label: 'Hiking', emoji: '🥾' },
  { slug: 'kayaking', label: 'Kayaking', emoji: '🛶' },
  { slug: 'paddle_boarding', label: 'Paddle boarding', emoji: '🏄' },
  { slug: 'boating', label: 'Boating', emoji: '⛵' },
  { slug: 'ebikes', label: 'E-bikes', emoji: '⚡' },
  { slug: 'atv_utv', label: 'ATV/UTV', emoji: '🏍️' },
  { slug: 'sports', label: 'Sports', emoji: '🏆' },
  { slug: 'cards', label: 'Cards', emoji: '🃏' },
  { slug: 'live_music', label: 'Live music', emoji: '🎵' },
]

const PRIVACY_MODES = [
  { slug: 'visible', label: 'Visible', desc: 'In the list. Open to waves.' },
  { slug: 'quiet', label: 'Quiet', desc: 'Hidden, but you can wave first.' },
  { slug: 'invisible', label: 'Invisible', desc: 'Just here to look around.' },
  {
    slug: 'campground_updates_only',
    label: 'Campground Updates Only',
    desc: 'Bulletins only. Invisible to other campers.',
  },
]

const PRIVACY_LABEL = Object.fromEntries(
  PRIVACY_MODES.map((m) => [m.slug, m.label]),
)

const SAMPLE_CAMPERS = [
  {
    id: 'c1',
    name: 'Sarah & Jim',
    displayName: 'Sarah & Jim T.',
    username: 'rolling_pines',
    status: 'Coffee on the porch · come say hi',
    rig: 'Class B',
    from: 'Asheville, NC',
    years: 8,
    style: 'Full-timer',
    interests: ['coffee', 'campfire', 'dogs', 'hiking'],
  },
  {
    id: 'c2',
    name: 'Alex',
    displayName: 'Alex M.',
    username: 'wandering_alex',
    status: 'Reading by the fire',
    rig: 'Travel trailer',
    from: 'Boulder, CO',
    years: 3,
    style: 'Weekender',
    interests: ['hiking', 'kayaking', 'live_music'],
  },
  {
    id: 'c3',
    name: 'The Browns',
    displayName: 'The Browns',
    username: 'browns_on_road',
    status: null,
    rig: 'Class A',
    from: 'Tampa, FL',
    years: 12,
    style: 'Snowbird',
    interests: ['cards', 'coffee', 'dogs'],
  },
  {
    id: 'c4',
    name: 'Jordan',
    displayName: 'Jordan K.',
    username: 'jordan_solo',
    status: 'Open to chat',
    rig: 'Sprinter van',
    from: 'Portland, OR',
    years: 2,
    style: 'Solo traveler',
    interests: ['paddle_boarding', 'ebikes', 'coffee'],
  },
  {
    id: 'c5',
    name: 'The Riveras',
    displayName: 'The Riveras',
    username: 'rivera_family',
    status: 'Kids at the playground',
    rig: 'Fifth wheel',
    from: 'Austin, TX',
    years: 5,
    style: 'Family traveler',
    interests: ['campfire', 'sports', 'kayaking', 'dogs'],
  },
  {
    id: 'c6',
    name: 'Pat & Linda',
    displayName: 'Pat & Linda H.',
    username: 'pat_and_linda',
    status: 'Just unpacked — exploring',
    rig: 'Travel trailer',
    from: 'Phoenix, AZ',
    years: 6,
    style: 'Seasonal guest',
    interests: ['hiking', 'campfire', 'cards'],
  },
  {
    id: 'c7',
    name: 'Marcus',
    displayName: 'Marcus T.',
    username: 'marcus_camphost',
    status: 'On duty — say hi at the office!',
    rig: 'Class C',
    from: 'Bend, OR',
    years: 15,
    style: 'Camp host',
    interests: ['coffee', 'hiking', 'live_music'],
  },
  {
    id: 'c8',
    name: 'Dani',
    displayName: 'Dani R.',
    username: 'dani_works_remote',
    status: 'Done with Zoom calls — beer time',
    rig: 'Sprinter van',
    from: 'Asheville, NC',
    years: 4,
    style: 'Work camper',
    interests: ['ebikes', 'paddle_boarding', 'coffee'],
  },
  {
    id: 'c9',
    name: 'Rob',
    displayName: 'Rob L.',
    username: 'rob_thru_town',
    status: 'In town for a job, leaving Sunday',
    rig: 'Class B',
    from: 'Denver, CO',
    years: 2,
    style: 'Traveling for work',
    interests: ['coffee', 'live_music'],
  },
  {
    id: 'c10',
    name: 'The Carters',
    displayName: 'The Carters',
    username: 'quiet_carters',
    status: null,
    rig: 'Truck camper',
    from: 'Missoula, MT',
    years: 9,
    style: 'Prefer quiet',
    interests: ['cats', 'hiking'],
  },
]

// Per-camper opening lines. The ChatScreen looks up the camper id and
// falls through to DEFAULT_OPENING for any id not in the map. Keeps each
// camper's voice consistent with their profile (style, tenure, vibe).
const OPENING_LINES = {
  c1: 'Hey there! So glad you waved — we were just about to make coffee. 😊',
  c2: 'Nice to meet you! Always love connecting with fellow campers 👋',
  c3: 'Well hey there neighbor! Twelve years on the road and we still love meeting new folks 😄',
  c4: 'Hey! Great to meet a fellow solo traveler out here 🙂',
}

const DEFAULT_OPENING =
  'Hey there! Nice to meet you — what a great campground to run into each other! 🏕️'

function getOpeningLine(camperId) {
  return OPENING_LINES[camperId] ?? DEFAULT_OPENING
}

// Conversation script — a small state machine. Each step is keyed by an id
// and has the camper's message (`them`) plus the quick replies the user sees
// after that message. Each reply points to the next step. A step with
// replies: null is a leaf — conversation ends warmly there.
//
// The user's quick replies rotate by depth: Set 1 (intro) at start, Set 2
// (mid-conversation) at step `mid`, Set 3 (planning) at step `plan`. Every
// option in a set leads to the same next step — the camper's reply is the
// same regardless of which option you picked, but the conversation feels
// authored because the next set fits the new context.
const CHAT_SCRIPT = {
  // start.them is overridden per-camper at runtime via getOpeningLine().
  // The text here is just a fallback in case the lookup is bypassed.
  start: {
    them: DEFAULT_OPENING,
    replies: [
      { you: 'Nice to meet you too! How long are you here?', next: 'mid' },
      { you: 'Love the vibe here — first time at this campground?', next: 'mid' },
      { you: 'Coffee sounds perfect — what time works?', next: 'mid' },
    ],
  },
  mid: {
    them: 'A few more days, then we head north. We come back here whenever we can — best little corner of the campground. How about you?',
    replies: [
      { you: 'Same! Where are you headed after this?', next: 'plan' },
      { you: 'How long have you been on the road?', next: 'plan' },
      { you: 'Any trail recommendations around here?', next: 'plan' },
    ],
  },
  plan: {
    them: "There's a great loop trail by the lake — easy 4 miles, dog-friendly. We are around a couple more nights if you want to plan something!",
    replies: [
      { you: "That's awesome! What kind of rig are you in?", next: 'wrap' },
      { you: 'We should grab a campfire spot tonight!', next: 'wrap' },
      { you: "Do you have a dog? We'd love to say hi 🐾", next: 'wrap' },
    ],
  },
  wrap: {
    them: 'Sounds great — see you out there! Stop by anytime. 👋',
    replies: null,
  },
}

// Wave-back script for the demo. Three of the five sample campers wave back
// (with varying delays so it feels like real people responding); the other
// two never wave back. Camper IDs map to the delay (in ms) before they
// reciprocate. IDs not in this map are non-matchers.
const WAVE_BACK_DELAYS = {
  c1: 1500, // Sarah & Jim — fastest, eager to chat
  c2: 2500, // Alex — a beat slower
  c5: 4000, // The Riveras — busy with kids, but they get there
}
// Time after which a non-matcher's card flips to the "no response" state.
const NO_RESPONSE_TIMEOUT = 5500


const HOSTED_MEETUPS = [
  {
    id: 'h1',
    title: 'Sunset campfire & marshmallows',
    location: 'Fire ring 3',
    time: 'Tonight · 7:30 PM',
    description: "Bring a chair. We'll have hot cocoa. All campers welcome.",
  },
  {
    id: 'h2',
    title: 'Morning yoga by the lake',
    location: 'Lakeside lawn',
    time: 'Tomorrow · 7:00 AM',
    description: 'Bring a mat. Beginner-friendly. 45 minutes.',
  },
]

const CAMPER_MEETUPS = [
  {
    id: 'c1',
    username: 'solo_ranger',
    message:
      'Anyone want to kayak at 8am? Launching from the south dock.',
  },
  {
    id: 'c2',
    username: 'rolling_pines',
    message:
      'Acoustic guitar at our site tonight, site area north loop. All welcome, bring snacks.',
  },
  {
    id: 'c3',
    username: 'weekend_fam',
    message:
      'Kids nature scavenger hunt, Saturday 10am, meeting at the playground. All ages welcome.',
  },
]

const CROSSED_PATHS = [
  {
    name: 'Sarah & Jim',
    username: 'rolling_pines',
    campground: 'Riverbend RV Park',
    when: '2 days ago',
    style: 'Full-timer',
    interests: ['coffee', 'dogs'],
  },
  {
    name: 'Alex',
    username: 'wandering_alex',
    campground: 'Coastal Pines',
    when: '1 week ago',
    style: 'Weekender',
    interests: ['hiking'],
  },
]

const INTEREST_LABEL = Object.fromEntries(INTERESTS.map((i) => [i.slug, i.label]))
const INTEREST_EMOJI = Object.fromEntries(INTERESTS.map((i) => [i.slug, i.emoji]))

// ----------------------------------------------------------------------------
// Top-level demo component
// ----------------------------------------------------------------------------

export default function DemoPage({ campgroundName = 'Riverbend RV Park' } = {}) {
  const [bannerDismissed, setBannerDismissed] = useState(false)
  // Bumping this key forces GuestApp + every descendant (NearbyScreen, its
  // filter Sets, etc.) to remount with default state. The Reset demo
  // button — and the in-app Exit/Restart action — increments it.
  const [demoKey, setDemoKey] = useState(0)

  // resetDemo is invoked from four places: the manual Reset button, the
  // in-chat Restart menu item, the bfcache `pageshow` listener (back
  // button), and the 10-minute inactivity timer. Bumping demoKey
  // remounts GuestApp with default React state; we also clear the
  // bottom CTA dismissal so each fresh start looks identical.
  function resetDemo() {
    setDemoKey((k) => k + 1)
    setBannerDismissed(false)
  }

  // Defensive: wipe any sessionStorage keys we (or a previous build)
  // might have written. Demo state lives entirely in React memory; this
  // guarantees no stray persisted bit can carry over between visits.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const toRemove = []
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        if (key && key.startsWith('roadwave:demo:')) toRemove.push(key)
      }
      for (const key of toRemove) window.sessionStorage.removeItem(key)
    } catch {
      // Storage blocked (private mode etc.) — no-op.
    }
  }, [])

  // Back-forward cache: when the visitor leaves /demo and hits the back
  // button, modern browsers can restore the page from bfcache with
  // React state intact. The `pageshow` event with `persisted === true`
  // is the bfcache-restore signal — force a reset whenever it fires so
  // returning to /demo always lands on Step 1.
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onPageShow(e) {
      if (e.persisted) resetDemo()
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // 10-minute inactivity timeout: any pointer/touch/key/scroll
  // interaction resets a rolling timer. When the timer fires we silently
  // reset the demo in place — no redirect, no alert.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const TEN_MIN = 10 * 60 * 1000
    let timer = window.setTimeout(resetDemo, TEN_MIN)
    function bump() {
      window.clearTimeout(timer)
      timer = window.setTimeout(resetDemo, TEN_MIN)
    }
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    for (const ev of events) window.addEventListener(ev, bump, { passive: true })
    return () => {
      window.clearTimeout(timer)
      for (const ev of events) window.removeEventListener(ev, bump)
    }
  }, [])

  return (
    <>
      <Head>
        <title>RoadWave · Demo</title>
        <meta
          name="description"
          content="Privacy-first campground connections — interactive demo."
        />
      </Head>

      <main className="min-h-screen bg-night text-cream font-sans">
        <div className="mx-auto max-w-5xl px-4 py-10 pb-28 flex flex-col items-center gap-8">
          <header className="text-center space-y-3">
            <Logo className="text-4xl sm:text-5xl" />
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-flame font-semibold">
              RoadWave Demo
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-mist">
              Demo · all data is mock
            </p>
          </header>

          <PhoneFrame>
            <GuestApp
              key={demoKey}
              campgroundName={campgroundName}
              onReset={resetDemo}
            />
          </PhoneFrame>

          <button
            type="button"
            onClick={resetDemo}
            className="text-sm text-mist underline-offset-2 hover:text-cream hover:underline"
          >
            Reset demo
          </button>
        </div>
      </main>

      {!bannerDismissed && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:pb-4">
          <div className="mx-auto max-w-3xl flex items-center gap-2 rounded-2xl border border-flame/40 bg-flame text-night px-4 py-3 shadow-2xl shadow-black/50">
            <a
              href="/signup"
              className="flex-1 font-semibold text-sm sm:text-base hover:underline"
            >
              Love what you see? Create your free account →
            </a>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-night/70 hover:bg-night/10 hover:text-night transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ----------------------------------------------------------------------------
// Logo + phone frame
// ----------------------------------------------------------------------------


function PhoneFrame({ children }) {
  return (
    <div className="relative w-full max-w-[380px]">
      {/* Outer body */}
      <div
        className="relative rounded-[3rem] border-[12px] border-black bg-night shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8),0_20px_40px_-10px_rgba(245,158,11,0.1)] overflow-hidden"
        style={{ aspectRatio: '9 / 19.5' }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-20" />
        {/* Screen */}
        <div className="absolute inset-0 overflow-y-auto pt-8 pb-3 px-1">
          <div className="rounded-[2rem] bg-night min-h-full">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Welcome
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Guest app
// ----------------------------------------------------------------------------

function GuestApp({ campgroundName, onReset }) {
  const [screen, setScreen] = useState('home')
  // Multi-select travel styles. Empty Set = "All" (no preference declared).
  const [travelStyles, setTravelStyles] = useState(() => new Set())
  const [chosenInterests, setChosenInterests] = useState(['coffee', 'campfire', 'dogs'])
  const [privacy, setPrivacy] = useState('visible')
  // The 5-step flow requires the visitor to be the initiator of every
  // wave they experience, so we start with no pre-seeded wave state.
  // Wave states: 'waved' (Step 2) → 'consent' (Step 4) → 'connected'
  // (Step 5). 'declined' is used when the visitor taps Not Yet.
  // 'noresponse' is the no-cringe fallback for non-matchers.
  const [waved, setWaved] = useState({})
  const [match, setMatch] = useState(null) // { id, name } during celebration
  const [chatWith, setChatWith] = useState(null) // { id, name } when chat is open
  const [crossedChatWith, setCrossedChatWith] = useState(null) // { username, name, ... } when a Crossed paths card is open
  const [blocked, setBlocked] = useState(() => new Set()) // ids the user has blocked
  const [toast, setToast] = useState(null) // { msg } banner shown on Nearby/Waves
  function toggleTravelStyle(style) {
    setTravelStyles((prev) => {
      const next = new Set(prev)
      if (next.has(style)) next.delete(style)
      else next.add(style)
      return next
    })
  }

  function toggleInterest(slug) {
    setChosenInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  function handleMessage(id) {
    const camper = SAMPLE_CAMPERS.find((c) => c.id === id)
    if (!camper) return
    setChatWith({ id, name: camper.name })
    setScreen('chat')
  }

  function openCrossedPath(path) {
    setCrossedChatWith(path)
    setScreen('crossedchat')
  }

  function removeWave(id) {
    setWaved((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function showToast(msg) {
    setToast({ msg, ts: Date.now() })
    window.setTimeout(() => {
      setToast((curr) => (curr && curr.msg === msg ? null : curr))
    }, 3500)
  }

  // Block: hide the camper from Nearby + Waves, drop any wave history, return
  // to Nearby with a toast. The other camper is never notified — there is no
  // network call in this demo, but the language across the UI reflects what
  // the real app does: blocking is silent and one-way.
  function blockCamper(id) {
    setBlocked((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setWaved((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setChatWith(null)
    setScreen('nearby')
    showToast('Camper removed from your view')
  }

  // Leave: just close the chat back to Nearby. Match/wave history is
  // preserved so the user can come back later from the Waves tab. Reason
  // dropdown is collected for product feedback only — never sent to the
  // other camper.
  function leaveConversation() {
    setChatWith(null)
    setScreen('nearby')
  }

  function handleWave(id) {
    // Step 2 — Wave Sent: button on card flips to "Waved · waiting" and
    // a brief inline confirmation appears. The visitor cannot wave the
    // same person twice (CamperCard renders the disabled state when
    // waved[id] is set).
    setWaved((prev) => ({ ...prev, [id]: 'waved' }))

    const matcherDelay = WAVE_BACK_DELAYS[id]
    if (matcherDelay) {
      // Step 3 happens on the receiver's side — the spec calls for
      // walking through it visibly, so we use the toast as a brief
      // narrative beat ("they got your wave...") before flipping into
      // the consent prompt at Step 4.
      window.setTimeout(() => {
        const camper = SAMPLE_CAMPERS.find((c) => c.id === id)
        if (!camper) return
        setWaved((prev) => ({ ...prev, [id]: 'consent' }))
        setChatWith({ id, name: camper.name })
        setScreen('matchchoice')
      }, matcherDelay)
      return
    }

    // Non-matcher: after a longer "they had time to see it" window, flip to
    // the no-cringe no-response state.
    window.setTimeout(() => {
      setWaved((prev) => ({ ...prev, [id]: 'noresponse' }))
    }, NO_RESPONSE_TIMEOUT)
  }

  // Visitor-side consent for Step 4. Tapping Connect promotes the wave
  // to 'connected' and opens the chat (Step 5). Tapping Not Yet silently
  // dismisses and returns to Nearby — no notification to the other side.
  function handleConsent(id, connect) {
    if (!connect) {
      setWaved((prev) => ({ ...prev, [id]: 'declined' }))
      setChatWith(null)
      setScreen('nearby')
      return
    }
    const camper = SAMPLE_CAMPERS.find((c) => c.id === id)
    if (!camper) return
    setWaved((prev) => ({ ...prev, [id]: 'connected' }))
    setMatch({ id, name: camper.name })
    window.setTimeout(() => {
      setMatch(null)
      setChatWith({ id, name: camper.name })
      setScreen('chat')
    }, 1500)
  }

  return (
    <div className="relative flex h-full flex-col">
      <AppHeader onNavigate={setScreen} />

      {/* Status bar: privacy mode rendered as its own centered row below
          the header. Used to live in AppHeader's right slot, but the
          Campground Updates Only label is long enough to wrap onto a
          second line on phone widths and crowd the lantern + Sign out
          controls. */}
      <div className="border-b border-white/5 px-3 py-1.5 flex justify-center">
        <span data-tour="privacy-badge" className="inline-flex">
          <ModeBadge mode={privacy} />
        </span>
      </div>

      {screen !== 'chat' && screen !== 'matchchoice' && screen !== 'crossedchat' && (
        <nav className="grid grid-cols-4 gap-1 px-3 pb-2 pt-2 text-[11px]">
          {[
            ['home', 'Home'],
            ['checkin', 'Check in'],
            ['nearby', 'Campers Here'],
            ['meetups', 'Meetups'],
            ['waves', 'Waves'],
            ['privacy', 'Privacy'],
            ['paths', 'Past Waves'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-tour={`tab-${id}`}
              onClick={() => setScreen(id)}
              className={
                screen === id
                  ? 'rounded-md bg-flame/15 text-flame px-2 py-1.5 font-semibold'
                  : 'rounded-md text-mist px-2 py-1.5 hover:text-cream'
              }
            >
              {label}
            </button>
          ))}
        </nav>
      )}
      <div
        className={
          screen === 'chat' || screen === 'crossedchat'
            ? 'flex-1 overflow-hidden'
            : screen === 'matchchoice'
              ? 'flex-1 overflow-y-auto'
              : 'flex-1 overflow-y-auto px-4 pb-6'
        }
      >
        {screen === 'home' && (
          <HomeScreen
            privacyMode={privacy}
            onScreen={setScreen}
            campgroundName={campgroundName}
          />
        )}
        {screen === 'checkin' && (
          <CheckInScreen
            travelStyles={travelStyles}
            onToggleStyle={toggleTravelStyle}
            onClearStyles={() => setTravelStyles(new Set())}
            chosenInterests={chosenInterests}
            onToggleInterest={toggleInterest}
            privacyMode={privacy}
            onPrivacy={setPrivacy}
            onCheckedIn={() => setScreen('nearby')}
            campgroundName={campgroundName}
          />
        )}
        {screen === 'nearby' && (
          <NearbyScreen
            waved={waved}
            onWave={handleWave}
            campgroundName={campgroundName}
            blocked={blocked}
            toast={toast}
            onDismissToast={() => setToast(null)}
            viewerInterests={chosenInterests}
            privacy={privacy}
            onChangePrivacy={() => setScreen('privacy')}
          />
        )}
        {screen === 'meetups' && <MeetupsScreen campgroundName={campgroundName} />}
        {screen === 'waves' && (
          <WavesScreen
            waved={waved}
            onMessage={handleMessage}
            onRemove={removeWave}
            blocked={blocked}
          />
        )}
        {screen === 'privacy' && (
          <PrivacyScreen mode={privacy} onChange={setPrivacy} />
        )}
        {screen === 'paths' && (
          <CrossedPathsScreen
            waved={waved}
            campgroundName={campgroundName}
            onOpen={openCrossedPath}
          />
        )}
        {screen === 'crossedchat' && crossedChatWith && (
          <CrossedPathChatScreen
            path={crossedChatWith}
            onBack={() => {
              setCrossedChatWith(null)
              setScreen('paths')
            }}
          />
        )}
        {screen === 'matchchoice' && chatWith && (
          <ConsentPromptScreen
            camper={SAMPLE_CAMPERS.find((c) => c.id === chatWith.id)}
            viewerInterests={chosenInterests}
            onConnect={() => handleConsent(chatWith.id, true)}
            onNotYet={() => handleConsent(chatWith.id, false)}
          />
        )}
        {screen === 'chat' && chatWith && (
          <ChatScreen
            camper={chatWith}
            onBack={() => {
              setChatWith(null)
              setScreen('nearby')
            }}
            onLeave={leaveConversation}
            onBlock={blockCamper}
            onReset={onReset}
          />
        )}
      </div>
      {match && <MatchCelebration name={match.name} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
// ConsentPromptScreen — Step 4 of the wave flow. Both campers waved at each
// other; both must explicitly tap Connect for the connection to land.
// Tapping Not Yet silently dismisses without notifying the other camper.
// Per spec: NO name reveal here — the camper card stays anonymous until
// Step 5 (Connected).
// ----------------------------------------------------------------------------

function ConsentPromptScreen({ camper, viewerInterests, onConnect, onNotYet }) {
  const viewerSet = new Set(viewerInterests ?? [])
  const shared = (camper?.interests ?? []).filter((slug) => viewerSet.has(slug))
  return (
    <div className="px-4 py-6 space-y-4">
      <header className="space-y-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-flame">
          You have a mutual wave
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Would you like to connect?
        </h1>
        <p className="text-sm text-cream/85 leading-relaxed">
          You and a nearby camper have waved at each other. Would you like to
          connect and say hello?
        </p>
      </header>

      <div className="space-y-3 rounded-xl border border-white/5 bg-night/60 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-mist/70">
          A nearby camper
        </p>
        {camper?.rig && (
          <p className="text-xs text-cream">
            <span className="text-mist">Rig · </span>
            <span className="font-semibold">{camper.rig}</span>
          </p>
        )}
        {shared.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {shared.map((slug) => (
              <li
                key={slug}
                className="inline-flex items-center gap-1 rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] text-cream"
              >
                <span aria-hidden>{INTEREST_EMOJI[slug]}</span>
                {INTEREST_LABEL[slug]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          onClick={onConnect}
          className="w-full rounded-xl bg-flame text-night px-4 py-3 text-sm font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 inline-flex items-center justify-center gap-2"
        >
          Connect <span aria-hidden>🎉</span>
        </button>
        <button
          type="button"
          onClick={onNotYet}
          className="w-full rounded-xl border border-white/10 bg-white/5 text-cream px-4 py-3 text-sm font-medium hover:bg-white/10"
        >
          Not Yet
        </button>
      </div>

      <p className="text-[11px] text-mist/70 leading-snug text-center">
        We connect you only if both of you tap Connect. Tapping Not Yet
        dismisses this quietly — the other person isn&apos;t notified.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Chat screen + bubble
// ----------------------------------------------------------------------------

function ChatScreen({ camper, onBack, onLeave, onBlock, onReset }) {
  // The pre-populated welcome lands as the visitor's first message
  // (Step 5: "First message pre-populated as: 'Hey, nice to meet you!'").
  // The camper's per-camper opening line then arrives as their reply.
  const [messages, setMessages] = useState(() => [
    { id: 'welcome', from: 'you', text: 'Hey, nice to meet you!' },
  ])
  const [currentStep, setCurrentStep] = useState('start')
  const [typing, setTyping] = useState(false)
  const [phase, setPhase] = useState('opening')
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const scrollRef = useRef(null)

  // On mount: brief typing indicator, then the camper replies to the
  // pre-populated welcome with their per-camper opener.
  useEffect(() => {
    let cancelled = false
    setTyping(true)
    const timer = window.setTimeout(() => {
      if (cancelled) return
      const step = CHAT_SCRIPT.start
      const openingText = getOpeningLine(camper.id)
      setMessages((prev) => [
        ...prev,
        { id: `t-start-${Date.now()}`, from: 'them', text: openingText },
      ])
      setTyping(false)
      setPhase(step.replies ? 'waiting' : 'done')
    }, 1100)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [camper.id])

  // Smooth auto-scroll on new content.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function handleQuickReply(reply) {
    if (phase !== 'waiting') return
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'you', text: reply.you },
    ])
    setPhase('replying')
    // Brief pause before the typing indicator shows up.
    window.setTimeout(() => setTyping(true), 350)
    // Camper's response lands 1.5s after the user tapped.
    window.setTimeout(() => {
      const nextStep = CHAT_SCRIPT[reply.next]
      setTyping(false)
      if (!nextStep) {
        setPhase('done')
        return
      }
      setMessages((prev) => [
        ...prev,
        { id: `t-${reply.next}-${Date.now()}`, from: 'them', text: nextStep.them },
      ])
      setCurrentStep(reply.next)
      setPhase(nextStep.replies ? 'waiting' : 'done')
    }, 1500)
  }

  const currentReplies =
    phase === 'waiting' ? CHAT_SCRIPT[currentStep]?.replies ?? null : null

  // Step 5 — Connected. Show first names only, never last names. Even
  // though SAMPLE_CAMPERS includes pairs like "Sarah & Jim", we render
  // only the leading first-name token here.
  const firstName = (camper.name ?? '').trim().split(/\s+/)[0] || 'Camper'

  return (
    <div className="relative flex h-full flex-col">
      <div className="px-3 pt-2">
        <div className="rounded-md border border-flame/30 bg-flame/[0.08] px-3 py-2 text-[11px] text-cream leading-snug">
          <span className="font-semibold text-flame">New Connection! 🎉 </span>
          Meet smart: use public campground areas, trust your instincts, and
          report pressure, harassment, or suspicious behavior.
        </div>
      </div>
      <div className="flex items-center gap-3 border-b border-white/5 bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
          aria-label="Back to nearby"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-cream leading-tight truncate">
            {firstName}
          </p>
          <p className="flex items-center gap-1 text-[10px] text-leaf">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            {typing ? 'typing…' : 'Online'}
          </p>
        </div>
        <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[9px] font-semibold text-flame">
          CONNECTED
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Conversation options"
            aria-expanded={menuOpen}
            className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-white/10 bg-card shadow-2xl shadow-black/60 overflow-hidden"
              >
                {onReset && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      onReset()
                    }}
                    className="block w-full text-left px-3 py-2 text-xs text-flame hover:bg-flame/10 border-b border-white/5"
                  >
                    Restart demo
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirm('leave')
                  }}
                  className="block w-full text-left px-3 py-2 text-xs text-cream hover:bg-white/5"
                >
                  Leave conversation
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setConfirm('block')
                  }}
                  className="block w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 border-t border-white/5"
                >
                  Block this camper
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {messages.map((m) => (
          <ChatBubble key={m.id} side={m.from === 'them' ? 'them' : 'you'}>
            {m.text}
          </ChatBubble>
        ))}
        {typing && <TypingBubble />}
      </div>

      {currentReplies && currentReplies.length > 0 && (
        <div className="border-t border-white/5 bg-card/60 px-3 pt-2 pb-1.5">
          <p className="mb-1.5 text-[9px] uppercase tracking-[0.2em] text-mist/70">
            Quick replies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentReplies.map((r, i) => (
              <button
                key={`${currentStep}-${i}`}
                type="button"
                onClick={() => handleQuickReply(r)}
                className="rounded-full border border-white/10 bg-white/5 text-cream text-[11px] px-2.5 py-1 hover:border-flame/40 hover:bg-flame/10 transition-colors"
              >
                {r.you}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-white/5 bg-card px-3 py-2">
        <input
          className="flex-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-mist focus:outline-none focus:ring-1 focus:ring-flame"
          placeholder="Type a message…"
          readOnly
        />
        <button
          type="button"
          className="grid h-7 w-7 place-items-center rounded-full bg-flame text-night text-xs font-bold"
          aria-label="Send"
        >
          →
        </button>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0);   opacity: 0.4; }
          30%           { transform: translateY(-4px); opacity: 1;   }
        }
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .typing-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(245, 236, 217, 0.85);
          display: inline-block;
          animation: typingBounce 1.2s infinite;
        }
        .chat-msg { animation: msgSlideIn 0.32s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .typing-dot { animation: none; opacity: 0.7; }
          .chat-msg { animation: none; }
        }
      `}</style>

      {confirm === 'block' && (
        <BlockConfirmScreen
          camperName={camper.name}
          onCancel={() => setConfirm(null)}
          onConfirm={() => onBlock(camper.id)}
        />
      )}
      {confirm === 'leave' && (
        <LeaveConfirmScreen
          camperName={camper.name}
          onCancel={() => setConfirm(null)}
          onConfirm={() => onLeave()}
        />
      )}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2.5">
        <span className="typing-dot" style={{ animationDelay: '0s' }} aria-hidden />
        <span className="typing-dot" style={{ animationDelay: '0.18s' }} aria-hidden />
        <span className="typing-dot" style={{ animationDelay: '0.36s' }} aria-hidden />
      </div>
    </div>
  )
}

function ChatBubble({ side, children }) {
  const them = side === 'them'
  return (
    <div className={`chat-msg flex ${them ? 'justify-start' : 'justify-end'}`}>
      <div
        className={
          them
            ? 'max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-xs text-cream'
            : 'max-w-[80%] rounded-2xl rounded-br-sm bg-flame text-night px-3 py-2 text-xs font-medium'
        }
      >
        {children}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Block + Leave confirmations. Both overlay the chat screen and collect a
// reason for product feedback only — never sent to the other camper. The
// language reflects the real promise: blocking and leaving are silent and
// one-way. The other person is never notified.
// ----------------------------------------------------------------------------

const BLOCK_REASONS = [
  'They made me feel uncomfortable',
  'Inappropriate messages',
  'Felt like a fake profile',
  'Not interested in connecting',
  'I changed my mind',
  'Prefer not to say',
]

const LEAVE_REASONS = [
  'Just not a match',
  'Conversation ran its course',
  'Made plans to meet up',
  'Changed my mind',
  'Prefer not to say',
]

function BlockConfirmScreen({ camperName, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-night">
      <header className="border-b border-white/5 bg-card px-3 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
        >
          ←
        </button>
        <p className="flex-1 text-sm font-semibold text-cream">Block {camperName}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-extrabold text-cream leading-tight">
            Why are you blocking this person?
          </h2>
          <p className="text-[11px] text-mist leading-snug">
            Your answer helps us improve RoadWave. It is never shared with{' '}
            {camperName}.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
          >
            <option value="" disabled>
              Pick a reason
            </option>
            {BLOCK_REASONS.map((r) => (
              <option key={r} value={r} className="bg-night text-cream">
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
            Anything else you want to share? (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add detail if you want — only RoadWave sees this."
            className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-mist leading-snug flex items-start gap-2">
          <span aria-hidden className="text-flame mt-0.5">🔒</span>
          <span>
            Blocking is private. {camperName} is not notified — they will never
            know you blocked them or why.
          </span>
        </div>
      </div>

      <div className="border-t border-white/5 bg-card px-3 py-3 space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-lg bg-red-500 hover:bg-red-400 text-white px-4 py-2.5 text-sm font-semibold shadow-lg shadow-red-500/20 transition-colors"
        >
          Confirm Block
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
        >
          Never mind
        </button>
      </div>
    </div>
  )
}

function LeaveConfirmScreen({ camperName, onCancel, onConfirm }) {
  const [reason, setReason] = useState('')

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-night">
      <header className="border-b border-white/5 bg-card px-3 py-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel"
          className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
        >
          ←
        </button>
        <p className="flex-1 text-sm font-semibold text-cream">
          Leave conversation
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-lg font-extrabold text-cream leading-tight">
            Mind sharing why?
          </h2>
          <p className="text-[11px] text-mist leading-snug">
            Optional — helps us learn. {camperName} is never notified.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-flame font-semibold">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 text-cream px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
          >
            <option value="" disabled>
              Pick a reason
            </option>
            {LEAVE_REASONS.map((r) => (
              <option key={r} value={r} className="bg-night text-cream">
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-mist leading-snug flex items-start gap-2">
          <span aria-hidden className="text-flame mt-0.5">🔒</span>
          <span>
            Leaving is private. No notification, no read receipt, no drama.
            You can come back from your Waves tab whenever you want.
          </span>
        </div>
      </div>

      <div className="border-t border-white/5 bg-card px-3 py-3 space-y-2">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-lg bg-flame hover:bg-amber-400 text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 transition-colors"
        >
          Leave conversation
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg border border-white/10 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors"
        >
          Never mind
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Match celebration overlay — the "magic moment". Hands fly in from both
// sides, sparkle bursts in the center, text pops in. Auto-dismisses after
// the parent's 2s timeout fires.
// ----------------------------------------------------------------------------

function MatchCelebration({ name }) {
  const firstName = (name ?? '').trim().split(/\s+/)[0] || 'Camper'
  return (
    <>
      <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-night/95 match-bg" aria-hidden />
        <div className="relative text-center px-4">
          <div className="flex items-center justify-center gap-5 mb-4">
            <span className="match-hand-left text-5xl" aria-hidden>👋</span>
            <span className="match-sparkle text-4xl" aria-hidden>✨</span>
            <span className="match-hand-right text-5xl" aria-hidden>👋</span>
          </div>
          <h2 className="match-title font-display text-3xl font-extrabold tracking-tight text-white">
            New Connection!
          </h2>
          <p className="match-name font-display text-lg font-extrabold text-flame mt-1">
            {firstName}
          </p>
          <p className="match-sub mt-3 font-serif italic text-cream/80 text-sm">
            Private hello is open
          </p>
        </div>
      </div>
      <style>{`
        @keyframes matchBg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes matchHandLeft {
          0%   { transform: translateX(-180%) rotate(-30deg); opacity: 0; }
          70%  { transform: translateX(8%)    rotate(0deg);   opacity: 1; }
          100% { transform: translateX(0)     rotate(0deg);   opacity: 1; }
        }
        @keyframes matchHandRight {
          0%   { transform: translateX(180%) rotate(30deg);  opacity: 0; }
          70%  { transform: translateX(-8%)  rotate(0deg);   opacity: 1; }
          100% { transform: translateX(0)    rotate(0deg);   opacity: 1; }
        }
        @keyframes matchHandWiggle {
          0%, 100% { transform: rotate(0deg); }
          25%      { transform: rotate(-15deg); }
          75%      { transform: rotate(15deg); }
        }
        @keyframes matchSparkle {
          0%   { transform: scale(0)   rotate(0deg);   opacity: 0; }
          60%  { transform: scale(1.5) rotate(200deg); opacity: 1; }
          100% { transform: scale(1)   rotate(360deg); opacity: 1; }
        }
        @keyframes matchTextPop {
          from { transform: translateY(16px) scale(0.85); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        .match-bg { animation: matchBg 0.3s ease-out both; }
        .match-hand-left {
          display: inline-block;
          animation:
            matchHandLeft 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both,
            matchHandWiggle 1.1s 0.7s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
        .match-hand-right {
          display: inline-block;
          animation:
            matchHandRight 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both,
            matchHandWiggle 1.1s 0.7s ease-in-out infinite reverse;
          transform-origin: 30% 70%;
        }
        .match-sparkle {
          display: inline-block;
          animation: matchSparkle 0.8s 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
        }
        .match-title { animation: matchTextPop 0.5s 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }
        .match-name  { animation: matchTextPop 0.5s 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }
        .match-sub   { animation: matchTextPop 0.5s 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) backwards; }
        @media (prefers-reduced-motion: reduce) {
          .match-bg,
          .match-hand-left,
          .match-hand-right,
          .match-sparkle,
          .match-title,
          .match-name,
          .match-sub {
            animation: none !important;
          }
        }
      `}</style>
    </>
  )
}

function AppHeader({ onNavigate }) {
  return (
    <header className="px-4 pt-2 pb-2 border-b border-white/5">
      <div className="flex items-center justify-between">
        <Logo className="text-lg" />
        <div className="flex items-center gap-3">
          <DemoLantern onNavigate={onNavigate} />
          <a
            href="/"
            className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            Exit
          </a>
          {/* Sign out is rendered for everyone here. Anonymous viewers
              just bounce to / (same as Exit); signed-in users get an
              actual Supabase signOut + redirect. Cheaper than wiring
              the demo into the Supabase session check. */}
          <form action="/auth/sign-out?next=/" method="post">
            <button
              type="submit"
              className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      {/* DEMO-ONLY label. The real authenticated app does not render this
          string — production nav stays clean. */}
      <p className="mt-1 text-right text-[10px] text-mist/70 leading-snug">
        Your Lantern — waves, private hellos &amp; meetup activity.
      </p>
    </header>
  )
}

function HomeScreen({ privacyMode, onScreen, campgroundName }) {
  return (
    <div className="space-y-5 py-3">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-[11px] font-semibold text-leaf">
          <span aria-hidden>✓</span>
          Checked in
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Welcome to {campgroundName}
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          You&apos;re checked in for 24 hours. See campground updates,
          meetup prompts, and campers who share your interests.
        </p>
      </header>

      <div className="rounded-xl border border-white/5 bg-card px-3 py-2 flex items-center gap-3">
        <ModeBadge mode={privacyMode} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-mist">Privacy</p>
          <p className="text-sm font-semibold text-cream">{PRIVACY_LABEL[privacyMode] ?? privacyMode}</p>
        </div>
        <button
          type="button"
          onClick={() => onScreen('privacy')}
          className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
        >
          Change
        </button>
      </div>

      <div data-tour="action-section" className="space-y-2">
        <Eyebrow>Where the action is</Eyebrow>
        <Tile title="Check in" description="Scan the campground QR." onClick={() => onScreen('checkin')} />
        <Tile title="Campers checked in here" description="Who shares your interests?" onClick={() => onScreen('nearby')} />
        <Tile title="Meetup spots" description="Activities posted by your campground." onClick={() => onScreen('meetups')} />
        <Tile title="Crossed paths" description="Mutual waves you've made." onClick={() => onScreen('paths')} />
      </div>

      {/* Prominent next-action CTA. The Nearby tab is the heart of the
          product, so we surface a big amber button right under the tile
          grid so prospects (especially campground owners) have an
          unmistakable next step. */}
      <button
        type="button"
        onClick={() => onScreen('nearby')}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-3 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 active:opacity-90 transition-colors"
      >
        See Campers Checked In Here
        <span aria-hidden>→</span>
      </button>
    </div>
  )
}

function Tile({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left flex items-center gap-3 rounded-xl border border-white/5 bg-card p-3 transition-colors hover:border-flame/40"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-flame/10 text-flame group-hover:bg-flame group-hover:text-night transition-colors">
        <ArrowIcon />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-cream">{title}</span>
        <span className="block text-xs text-mist">{description}</span>
      </span>
    </button>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

// ----------------------------------------------------------------------------
// Check-in screen
// ----------------------------------------------------------------------------

function CheckInScreen({
  travelStyles,
  onToggleStyle,
  onClearStyles,
  chosenInterests,
  onToggleInterest,
  privacyMode,
  onPrivacy,
  onCheckedIn,
  campgroundName,
}) {
  return (
    <div className="space-y-6 py-3">
      <header className="space-y-2">
        <Eyebrow>Check in</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Where are you parked?
        </h1>
        <p className="font-serif italic text-flame text-base leading-snug">
          Campground check-ins expire after 24 hours.
        </p>
      </header>

      <div className="rounded-2xl border border-flame/30 bg-flame/10 p-4">
        <p className="text-[11px] uppercase tracking-wide text-flame">Check in to</p>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-cream">
          {campgroundName}
        </h2>
        <p className="text-xs text-mist">Asheville, NC</p>
      </div>

      <Section
        eyebrow="Travel style"
        hint="Pick your style — choose as many as you like."
      >
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearStyles}
            aria-pressed={travelStyles.size === 0}
            className={
              travelStyles.size === 0
                ? 'rounded-full bg-flame px-3 py-1 text-xs font-semibold text-night shadow-md shadow-flame/20'
                : 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-cream hover:border-flame/40'
            }
          >
            All
          </button>
          {TRAVEL_STYLES.map((s) => {
            const active = travelStyles.has(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => onToggleStyle(s)}
                aria-pressed={active}
                className={
                  active
                    ? 'rounded-full bg-flame px-3 py-1 text-xs font-semibold text-night shadow-md shadow-flame/20'
                    : 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-cream hover:border-flame/40'
                }
              >
                {s}
              </button>
            )
          })}
        </div>
      </Section>

      <Section eyebrow="Interests" hint="Surface in the nearby filter.">
        <div className="grid grid-cols-2 gap-1.5">
          {INTERESTS.map((i) => {
            const active = chosenInterests.includes(i.slug)
            return (
              <button
                key={i.slug}
                type="button"
                onClick={() => onToggleInterest(i.slug)}
                className={
                  active
                    ? 'flex items-center gap-2 rounded-xl border border-flame bg-flame/10 px-3 py-2 text-xs font-semibold text-cream'
                    : 'flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2 text-xs text-cream'
                }
              >
                <span className="text-lg leading-none">{i.emoji}</span>
                <span>{i.label}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <Section eyebrow="Privacy mode">
        <div className="space-y-1.5">
          {PRIVACY_MODES.map((m) => {
            const active = privacyMode === m.slug
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => onPrivacy(m.slug)}
                className={
                  active
                    ? 'w-full text-left rounded-xl border border-flame bg-flame/10 px-3 py-2'
                    : 'w-full text-left rounded-xl border border-white/10 bg-card px-3 py-2'
                }
              >
                <span className="block text-sm font-semibold text-cream">{m.label}</span>
                <span className="block text-[11px] text-mist">{m.desc}</span>
              </button>
            )
          })}
        </div>
      </Section>

      <button
        type="button"
        onClick={onCheckedIn}
        className="w-full rounded-xl bg-flame text-night px-4 py-3 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 inline-flex items-center justify-center gap-2"
      >
        Check in <span aria-hidden>👋</span>
      </button>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Nearby
// ----------------------------------------------------------------------------

function NearbyScreen({
  waved,
  onWave,
  campgroundName,
  blocked,
  toast,
  onDismissToast,
  viewerInterests,
  privacy,
  onChangePrivacy,
}) {
  // Discovery list: show up to 8 mock campers, minus anyone the viewer
  // has blocked. The Travel Style + Interest filter chips were removed
  // because they were visually identical to the Check In tab and
  // confused users about which screen they were on.
  const list = useMemo(() => {
    return SAMPLE_CAMPERS.filter((c) => !(blocked && blocked.has(c.id))).slice(0, 8)
  }, [blocked])

  if (privacy === 'campground_updates_only') {
    return (
      <div className="space-y-4 py-3">
        <p
          role="note"
          className="rounded-md border border-flame/30 bg-flame/[0.08] px-3 py-2 text-[11px] text-cream leading-snug"
        >
          <span className="font-semibold text-flame">Safety reminder: </span>
          Meet in public campground areas, trust your instincts, and do not
          share your exact site number unless you choose to.
        </p>
        <header>
          <Eyebrow>Currently at {campgroundName}</Eyebrow>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
            Campers Checked In Here
          </h1>
          <p className="font-serif italic text-flame text-sm leading-snug">
            Who&apos;s here, what they&apos;re into.
          </p>
        </header>
        <div className="rounded-2xl border border-flame/30 bg-flame/[0.06] p-4 space-y-2">
          <p className="text-sm text-cream leading-relaxed">
            You are in Campground Updates Only mode. Switch to Visible
            or Quiet to see campers checked in here.
          </p>
          <button
            type="button"
            onClick={onChangePrivacy}
            className="inline-flex text-xs font-semibold text-flame underline-offset-2 hover:underline"
          >
            Open privacy settings →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-3">
      <p
        role="note"
        className="rounded-md border border-flame/30 bg-flame/[0.08] px-3 py-2 text-[11px] text-cream leading-snug"
      >
        <span className="font-semibold text-flame">Safety reminder: </span>
        Meet in public campground areas, trust your instincts, and do not
        share your exact site number unless you choose to.
      </p>
      <header>
        <Eyebrow>Currently at {campgroundName}</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Campers Checked In Here
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Who&apos;s here, what they&apos;re into.
        </p>
      </header>

      {toast && (
        <div className="rounded-xl border border-leaf/40 bg-leaf/10 px-3 py-2 flex items-center gap-2">
          <span aria-hidden className="text-base leading-none">✓</span>
          <p className="flex-1 text-xs text-cream leading-snug">{toast.msg}</p>
          <button
            type="button"
            onClick={onDismissToast}
            aria-label="Dismiss"
            className="text-mist hover:text-cream text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}

      <ul className="space-y-2.5">
        {list.map((c) => (
          <li key={c.id}>
            <CamperCard
              camper={c}
              state={waved[c.id]}
              viewerInterests={viewerInterests}
              onWave={() => onWave(c.id)}
            />
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-xs text-mist">
            No campers checked in here right now.
          </li>
        )}
      </ul>
    </div>
  )
}

function CamperCard({ camper, state, viewerInterests, onWave }) {
  // Discovery list: lead with first-name-and-initial + travel style + up
  // to three interest tags. Shared interests (overlap with the viewer's
  // own picks from Check In) get a flame-tinted highlight; the rest fall
  // back to the camper's first three interests so the card always reads
  // like a real profile, even on a fresh demo session with no viewer
  // interests selected. Exact site numbers and locations are never shown.
  const viewerSet = new Set(viewerInterests ?? [])
  const allInterests = camper.interests ?? []
  const shared = allInterests.filter((slug) => viewerSet.has(slug))
  const visibleInterests = (shared.length > 0 ? shared : allInterests).slice(0, 3)
  const justWaved = state === 'waved' || state === 'consent'

  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 shadow-lg shadow-black/20 space-y-2">
      <header className="space-y-1.5">
        <p className="text-sm font-semibold text-cream leading-tight">
          {camper.displayName ?? camper.name}
        </p>
        <p>
          <span className="inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
            {camper.style}
          </span>
        </p>
      </header>

      {visibleInterests.length > 0 ? (
        <ul className="flex flex-wrap gap-1">
          {visibleInterests.map((slug) => {
            const isShared = viewerSet.has(slug)
            return (
              <li
                key={slug}
                className={
                  isShared
                    ? 'inline-flex items-center gap-1 rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] text-cream'
                    : 'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream'
                }
              >
                <span aria-hidden>{INTEREST_EMOJI[slug]}</span>
                {INTEREST_LABEL[slug]}
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="pt-1.5 border-t border-white/5 space-y-1.5">
        {state === 'connected' ? (
          <div className="rounded-lg border border-flame/40 bg-flame/15 px-3 py-1.5 text-center text-xs font-semibold text-flame">
            Connected
          </div>
        ) : state === 'noresponse' ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-center text-[11px] italic text-mist/70">
            No response yet — only you know you waved. <span aria-hidden>😊</span>
          </div>
        ) : justWaved ? (
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-center text-xs text-mist">
            Waved · waiting
          </div>
        ) : (
          <button
            type="button"
            onClick={onWave}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold shadow-md shadow-flame/15 hover:bg-amber-400"
          >
            Wave <span aria-hidden>👋</span>
          </button>
        )}
        {justWaved && (
          <p
            role="status"
            className="rounded-md border border-flame/30 bg-flame/10 px-2 py-1 text-[10px] leading-snug text-cream text-center"
          >
            Your wave was sent. If they wave back, you&apos;ll hear about it
            in your Lantern.
          </p>
        )}
      </div>
    </article>
  )
}

function Pill({ label, value }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px]">
      <span className="text-mist mr-1">{label}</span>
      <span className="text-cream">{value}</span>
    </span>
  )
}

// ----------------------------------------------------------------------------
// Waves — every camper you've waved at, matched or not. Lets the user reopen
// a chat after picking "Just a wave for now", or undo a wave they regret.
// ----------------------------------------------------------------------------

function WavesScreen({ waved, onMessage, onRemove, blocked }) {
  const entries = SAMPLE_CAMPERS.filter(
    (c) => waved[c.id] && !(blocked && blocked.has(c.id)),
  ).map((c) => ({
    camper: c,
    state: waved[c.id],
  }))

  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Your waves</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Waves
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Everyone you&apos;ve waved at. Reach out when you&apos;re ready.
        </p>
      </header>

      {/* Sample-conversation preview: shows new visitors how a wave →
          mutual wave → chat flow plays out, before they've matched
          with anyone in their own session. */}
      <section className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          How a wave becomes a hello
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-flame text-night px-3 py-2 text-xs font-medium">
              Hey 👋 saw you in the lakeside loop — coffee tomorrow?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-white/10 text-cream px-3 py-2 text-xs">
              Yes! 7am at the rec hall? I&apos;m in the silver Airstream.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-flame text-night px-3 py-2 text-xs font-medium">
              See you there ☕
            </div>
          </div>
        </div>
        <p className="text-[10px] text-mist italic">
          A mutual wave unlocks a private hello. No public posts, no group
          chat, no pressure.
        </p>
      </section>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-sm text-mist">
          No waves yet. Head to <span className="text-cream">Campers Here</span> and
          say hi to your neighbors.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {entries.map(({ camper, state }) => (
            <li
              key={camper.id}
              className="rounded-2xl border border-white/5 bg-card p-3 shadow-lg shadow-black/20 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  {state === 'connected' ? (
                    <h3 className="text-sm font-semibold text-cream leading-tight">
                      {(camper.name ?? '').trim().split(/\s+/)[0] ?? 'Camper'}
                    </h3>
                  ) : (
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-mist/70">
                      A nearby camper
                    </p>
                  )}
                </div>
                <WaveStateBadge state={state} />
              </div>
              <div className="flex gap-2 pt-1">
                {state === 'connected' && (
                  <button
                    type="button"
                    onClick={() => onMessage(camper.id)}
                    className="flex-1 rounded-lg border border-flame/40 bg-transparent px-3 py-1.5 text-xs font-semibold text-flame hover:bg-flame/10 transition-colors"
                  >
                    Open conversation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(camper.id)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-mist hover:text-cream hover:border-white/20 transition-colors"
                >
                  Remove wave
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function WaveStateBadge({ state }) {
  if (state === 'connected') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-flame/15 border border-flame/30 px-2 py-0.5 text-[10px] font-semibold text-flame">
        Connected <span aria-hidden>🎉</span>
      </span>
    )
  }
  if (state === 'consent') {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-flame/10 border border-flame/30 px-2 py-0.5 text-[10px] font-semibold text-flame">
        Mutual wave
      </span>
    )
  }
  if (state === 'declined') {
    return (
      <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] italic text-mist">
        Dismissed
      </span>
    )
  }
  if (state === 'noresponse') {
    return (
      <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] italic text-mist">
        No response yet
      </span>
    )
  }
  return (
    <span className="shrink-0 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-mist">
      Waiting
    </span>
  )
}

// ----------------------------------------------------------------------------
// Meetups
// ----------------------------------------------------------------------------

function MeetupsScreen({ campgroundName }) {
  return (
    <div className="space-y-5 py-3">
      <header>
        <Eyebrow>Meetups</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          What&apos;s happening
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          From the campground and from neighbors. Show up if you want.
        </p>
      </header>

      <section className="space-y-2">
        <SectionLabel verified>Hosted by {campgroundName}</SectionLabel>
        <ul className="space-y-2">
          {HOSTED_MEETUPS.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-flame/40 bg-flame/[0.04] p-3 shadow-lg shadow-black/20"
            >
              <div className="flex items-start gap-2">
                <h3 className="flex-1 text-sm font-semibold text-cream leading-tight">
                  {m.title}
                </h3>
                <VerifiedBadge title="Posted by the campground" />
              </div>
              <p className="text-[11px] text-mist mt-0.5">{m.time}</p>
              <span className="mt-1.5 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] text-flame">
                {m.location}
              </span>
              <p className="mt-2 text-xs text-cream/90 leading-snug">{m.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <SectionLabel>Posted by campers</SectionLabel>
        <ul className="space-y-2">
          {CAMPER_MEETUPS.map((m) => (
            <li
              key={m.id}
              className="rounded-2xl border border-white/5 bg-card p-3 shadow-lg shadow-black/20"
            >
              <p className="text-xs font-semibold text-flame">@{m.username}</p>
              <p className="mt-1 text-xs text-cream/90 leading-snug">{m.message}</p>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-3 text-sm font-semibold text-mist hover:text-cream hover:border-flame/40 hover:bg-white/5 transition-colors"
      >
        <span aria-hidden className="text-base leading-none">＋</span>
        Post Your Own Meetup
      </button>
    </div>
  )
}

function SectionLabel({ children, verified }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mist">
        {children}
      </p>
      {verified && <VerifiedBadge title="Verified campground" small />}
    </div>
  )
}

function VerifiedBadge({ title, small }) {
  const size = small ? 'h-3 w-3 text-[8px]' : 'h-4 w-4 text-[10px]'
  return (
    <span
      title={title}
      aria-label={title}
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-flame text-night font-bold leading-none`}
    >
      ✓
    </span>
  )
}

// ----------------------------------------------------------------------------
// Privacy modes
// ----------------------------------------------------------------------------

function PrivacyScreen({ mode, onChange }) {
  const iconFor = (slug) => {
    if (slug === 'visible') return '👁'
    if (slug === 'quiet') return '🤫'
    if (slug === 'invisible') return '👻'
    return '📍'
  }

  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Privacy mode</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          How visible are you?
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Four settings. You&apos;re always in control.
        </p>
      </header>

      <div className="space-y-2">
        {PRIVACY_MODES.map((m) => {
          const active = mode === m.slug
          return (
            <button
              key={m.slug}
              type="button"
              onClick={() => onChange(m.slug)}
              className={
                active
                  ? 'w-full text-left flex items-start gap-3 rounded-2xl border border-flame bg-flame/10 p-3'
                  : 'w-full text-left flex items-start gap-3 rounded-2xl border border-white/10 bg-card p-3'
              }
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-flame/15 text-flame text-base">
                {iconFor(m.slug)}
              </span>
              <span>
                <span className="block text-sm font-semibold text-cream">
                  {m.label}
                </span>
                <span className="block font-serif italic text-flame text-sm leading-snug">
                  {m.desc}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Crossed paths
// ----------------------------------------------------------------------------

function CrossedPathsScreen({ waved, campgroundName, onOpen }) {
  // Pull in any matches the user just made in the demo session
  const sessionMatches = SAMPLE_CAMPERS.filter((c) => waved[c.id] === 'matched').map(
    (c) => ({
      name: c.name,
      username: c.username,
      campground: campgroundName,
      when: 'Just now',
      style: c.style,
      interests: c.interests.slice(0, 3),
    }),
  )
  const all = [...sessionMatches, ...CROSSED_PATHS]

  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Mutual waves</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Crossed paths
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Tap to open the conversation.
        </p>
      </header>

      {all.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-xs text-mist">
          Try waving at someone in the Campers Here tab. Sarah & Jim wave back.
        </p>
      ) : (
        <ul className="space-y-2">
          {all.map((p, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onOpen?.(p)}
                className="block w-full text-left rounded-2xl border border-flame/30 bg-card p-3 shadow-lg shadow-black/20 hover:border-flame/60 hover:bg-flame/[0.04] active:opacity-90 transition-colors"
                style={{ WebkitTapHighlightColor: 'rgba(245, 158, 11, 0.15)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-cream">{p.name}</h3>
                    <p className="text-[11px] text-mist">@{p.username}</p>
                    <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
                      {p.style}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[10px] font-semibold text-flame">
                    <span aria-hidden>👋</span> Match
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-mist">
                  At {p.campground} · {p.when}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {p.interests.map((slug) => (
                    <li
                      key={slug}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream"
                    >
                      <span aria-hidden>{INTEREST_EMOJI[slug]}</span>
                      {INTEREST_LABEL[slug]}
                    </li>
                  ))}
                </ul>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Crossed-path chat — self-contained mock conversation. No DB lookup.
// Renders a few hardcoded messages keyed by camper username, plus any
// messages the user types during this demo session (kept in local state).
// ----------------------------------------------------------------------------

const MOCK_THREADS = {
  rolling_pines: [
    { from: 'them', body: "Hey! Loved running into you at Riverbend.", offsetMin: -2880 },
    { from: 'you', body: "Same — that fire ring was perfect.", offsetMin: -2870 },
    { from: 'them', body: "Where are you off to next?", offsetMin: -1440 },
    { from: 'you', body: "Heading north to Asheville for a couple weeks. You?", offsetMin: -1430 },
    { from: 'them', body: "We're staying through the weekend, then over to the coast. Coffee tomorrow morning if you're around?", offsetMin: -120 },
  ],
  wandering_alex: [
    { from: 'them', body: "Hey! Coastal Pines was a good one.", offsetMin: -10080 },
    { from: 'you', body: "It was! That sunset was unreal.", offsetMin: -10070 },
    { from: 'them', body: "Let me know if you ever swing back through Boulder.", offsetMin: -10000 },
  ],
}

const DEFAULT_MOCK_THREAD = [
  { from: 'them', body: "Hey, great to meet you!", offsetMin: -180 },
  { from: 'you', body: "Likewise — hope the road treats you well.", offsetMin: -170 },
]

function fmtTime(ts) {
  const d = new Date(ts)
  let hours = d.getHours()
  const minutes = d.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

function CrossedPathChatScreen({ path, onBack }) {
  // Resolve the seed messages once on mount. Timestamps are computed
  // relative to "now" so the conversation always feels recent regardless
  // of when the demo is loaded.
  const [messages, setMessages] = useState(() => {
    const seed = MOCK_THREADS[path.username] ?? DEFAULT_MOCK_THREAD
    const now = Date.now()
    return seed.map((m, i) => ({
      id: `seed-${i}`,
      from: m.from,
      body: m.body,
      ts: now + m.offsetMin * 60 * 1000,
    }))
  })
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  function send(e) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, from: 'you', body: trimmed, ts: Date.now() },
    ])
    setDraft('')
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="grid h-7 w-7 place-items-center rounded-full text-mist hover:bg-white/5 hover:text-cream text-base leading-none"
          aria-label="Back to crossed paths"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-cream leading-tight truncate">
            {path.name}
          </p>
          <p className="text-[10px] text-mist truncate">
            @{path.username} · {path.style}
          </p>
        </div>
        <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[9px] font-semibold text-flame">
          CROSSED
        </span>
      </div>

      {/* Crossed-paths context */}
      <p className="border-b border-white/5 bg-card/60 px-3 py-1.5 text-[10px] text-mist text-center">
        You crossed paths at <span className="text-cream">{path.campground}</span>{' '}
        · {path.when}
      </p>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
        {messages.map((m, i) => {
          const mine = m.from === 'you'
          const prev = i > 0 ? messages[i - 1] : null
          const tightToPrev = prev && prev.from === m.from
          return (
            <div
              key={m.id}
              className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%] flex flex-col gap-0.5">
                <div
                  className={
                    mine
                      ? 'rounded-2xl rounded-br-sm bg-flame text-night px-3 py-2 text-xs font-medium shadow-md shadow-flame/20'
                      : 'rounded-2xl rounded-bl-sm bg-white/10 text-cream px-3 py-2 text-xs'
                  }
                >
                  {m.body}
                </div>
                {!tightToPrev && (
                  <p
                    className={`text-[9px] text-mist px-1 ${mine ? 'text-right' : 'text-left'}`}
                  >
                    {fmtTime(m.ts)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="border-t border-white/5 bg-card px-3 py-2 flex items-end gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Type a message…"
          className="flex-1 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-mist focus:outline-none focus:ring-1 focus:ring-flame"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-flame text-night text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send"
        >
          →
        </button>
      </form>
    </div>
  )
}


// ----------------------------------------------------------------------------
// Shared bits
// ----------------------------------------------------------------------------

function Section({ eyebrow, hint, children }) {
  return (
    <section className="space-y-2">
      <Eyebrow>{eyebrow}</Eyebrow>
      {hint && <p className="text-[11px] text-mist">{hint}</p>}
      {children}
    </section>
  )
}

function Eyebrow({ children }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
      {children}
    </p>
  )
}

function ModeBadge({ mode }) {
  const styles = {
    visible: 'bg-leaf/15 text-leaf border-leaf/30',
    quiet: 'bg-flame/15 text-flame border-flame/30',
    invisible: 'bg-white/10 text-mist border-white/15',
    campground_updates_only: 'bg-flame/15 text-flame border-flame/30',
  }
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[mode] ?? 'bg-white/10 text-mist border-white/15'}`}
    >
      {PRIVACY_LABEL[mode] ?? mode}
    </span>
  )
}
