import { useMemo, useState } from 'react'
import Head from 'next/head'

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
]

const SAMPLE_CAMPERS = [
  {
    id: 'c1',
    name: 'Sarah & Jim',
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
    username: 'rivera_family',
    status: 'Kids at the playground',
    rig: 'Fifth wheel',
    from: 'Austin, TX',
    years: 5,
    style: 'Family traveler',
    interests: ['campfire', 'sports', 'kayaking', 'dogs'],
  },
]

const MEETUPS = [
  {
    id: 'm1',
    title: 'Sunset campfire & marshmallows',
    location: 'Fire ring 3',
    time: 'Tonight · 7:30 PM',
    description: "Bring a chair. We'll have hot cocoa. All campers welcome.",
  },
  {
    id: 'm2',
    title: 'Morning yoga by the lake',
    location: 'Lakeside lawn',
    time: 'Tomorrow · 7:00 AM',
    description: 'Bring a mat. Beginner-friendly. 45 minutes.',
  },
  {
    id: 'm3',
    title: 'Trail walk to Eagle Lookout',
    location: 'Trailhead parking',
    time: 'Saturday · 9:00 AM',
    description: '4-mile loop, moderate grade. Dogs welcome on leash.',
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

export default function DemoPage() {
  const [view, setView] = useState('welcome') // welcome | guest

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
        <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col items-center gap-8">
          <header className="text-center space-y-3">
            <Logo size="text-4xl sm:text-5xl" />
            <p className="font-serif italic text-flame text-lg sm:text-xl">
              Meet the right neighbors without making it weird.
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-mist">
              Demo · all data is mock
            </p>
          </header>

          <PhoneFrame>
            {view === 'welcome' && (
              <WelcomeScreen onGuest={() => setView('guest')} />
            )}
            {view === 'guest' && <GuestApp onExit={() => setView('welcome')} />}
          </PhoneFrame>

          <button
            type="button"
            onClick={() => setView('welcome')}
            className="text-sm text-mist underline-offset-2 hover:text-cream hover:underline"
          >
            Reset demo
          </button>
        </div>
      </main>
    </>
  )
}

// ----------------------------------------------------------------------------
// Logo + phone frame
// ----------------------------------------------------------------------------

function Logo({ size = 'text-3xl' }) {
  return (
    <span
      className={`font-display font-extrabold tracking-[-0.02em] leading-none ${size}`}
      aria-label="RoadWave"
    >
      <span className="text-cream">Road</span>
      <span className="text-flame">Wa</span>
      <span className="wave-emoji select-none" aria-hidden>
        👋
      </span>
      <span className="text-flame">e</span>
    </span>
  )
}

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

function WelcomeScreen({ onGuest }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center gap-5">
      <Logo size="text-4xl" />
      <p className="font-serif italic text-flame text-lg leading-snug">
        Meet the right neighbors without making it weird.
      </p>
      <p className="text-sm text-mist">
        Open when you want.
        <br />
        Invisible when you do not.
      </p>

      <div className="w-full pt-4">
        <button
          type="button"
          onClick={onGuest}
          className="w-full rounded-xl bg-flame text-night px-4 py-3 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors inline-flex items-center justify-center gap-2"
        >
          Try as Guest <span aria-hidden>👋</span>
        </button>
      </div>

      <p className="pt-3 text-[11px] text-mist/80 max-w-[260px]">
        A sandbox with realistic but fake data.
      </p>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Guest app
// ----------------------------------------------------------------------------

function GuestApp({ onExit }) {
  const [screen, setScreen] = useState('home')
  const [travelStyle, setTravelStyle] = useState('Full-timer')
  const [chosenInterests, setChosenInterests] = useState(['coffee', 'campfire', 'dogs'])
  const [privacy, setPrivacy] = useState('visible')
  const [waved, setWaved] = useState({}) // id -> 'waved' | 'matched'
  const [match, setMatch] = useState(null) // { id, name } during celebration
  const [chatWith, setChatWith] = useState(null) // { id, name } when chat is open

  function toggleInterest(slug) {
    setChosenInterests((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  function handleWave(id) {
    if (id === 'c1') {
      // Sarah & Jim — auto-match. Show the celebration overlay, then open
      // the chat screen after a 2s pause.
      const camper = SAMPLE_CAMPERS.find((c) => c.id === id)
      setWaved((prev) => ({ ...prev, [id]: 'matched' }))
      setMatch({ id, name: camper.name })
      window.setTimeout(() => {
        setMatch(null)
        setChatWith({ id, name: camper.name })
        setScreen('chat')
      }, 2000)
      return
    }
    setWaved((prev) => ({ ...prev, [id]: 'waved' }))
  }

  return (
    <div className="relative flex h-full flex-col">
      <AppHeader
        onExit={onExit}
        right={<ModeBadge mode={privacy} />}
      />
      {screen !== 'chat' && (
        <nav className="grid grid-cols-3 gap-1 px-3 pb-2 text-[11px]">
          {[
            ['home', 'Home'],
            ['checkin', 'Check in'],
            ['nearby', 'Nearby'],
            ['meetups', 'Meetups'],
            ['privacy', 'Privacy'],
            ['paths', 'Crossed'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
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
          screen === 'chat'
            ? 'flex-1 overflow-hidden'
            : 'flex-1 overflow-y-auto px-4 pb-6'
        }
      >
        {screen === 'home' && (
          <HomeScreen privacyMode={privacy} onScreen={setScreen} />
        )}
        {screen === 'checkin' && (
          <CheckInScreen
            travelStyle={travelStyle}
            onTravelStyle={setTravelStyle}
            chosenInterests={chosenInterests}
            onToggleInterest={toggleInterest}
            privacyMode={privacy}
            onPrivacy={setPrivacy}
            onCheckedIn={() => setScreen('nearby')}
          />
        )}
        {screen === 'nearby' && (
          <NearbyScreen waved={waved} onWave={handleWave} myStyle={travelStyle} />
        )}
        {screen === 'meetups' && <MeetupsScreen />}
        {screen === 'privacy' && (
          <PrivacyScreen mode={privacy} onChange={setPrivacy} />
        )}
        {screen === 'paths' && <CrossedPathsScreen waved={waved} />}
        {screen === 'chat' && chatWith && (
          <ChatScreen
            camper={chatWith}
            onBack={() => {
              setChatWith(null)
              setScreen('nearby')
            }}
          />
        )}
      </div>
      {match && <MatchCelebration name={match.name} />}
    </div>
  )
}

// ----------------------------------------------------------------------------
// Chat screen + bubble
// ----------------------------------------------------------------------------

function ChatScreen({ camper, onBack }) {
  return (
    <div className="flex h-full flex-col">
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
            {camper.name}
          </p>
          <p className="flex items-center gap-1 text-[10px] text-leaf">
            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
            Online
          </p>
        </div>
        <span className="rounded-full border border-flame/40 bg-flame/15 px-2 py-0.5 text-[9px] font-semibold text-flame">
          MATCHED
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <p className="text-center text-[10px] text-mist/70 my-2">Just now</p>
        <ChatBubble side="them">Hey neighbor! 👋</ChatBubble>
        <ChatBubble side="them">Saw your wave — nice rig!</ChatBubble>
        <ChatBubble side="them">Coffee at the firepit at 9?</ChatBubble>
      </div>
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
    </div>
  )
}

function ChatBubble({ side, children }) {
  const them = side === 'them'
  return (
    <div className={`flex ${them ? 'justify-start' : 'justify-end'}`}>
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
// Match celebration overlay — the "magic moment". Hands fly in from both
// sides, sparkle bursts in the center, text pops in. Auto-dismisses after
// the parent's 2s timeout fires.
// ----------------------------------------------------------------------------

function MatchCelebration({ name }) {
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
            You matched!
          </h2>
          <p className="match-name font-display text-lg font-extrabold text-flame mt-1">
            {name}
          </p>
          <p className="match-sub mt-3 font-serif italic text-cream/80 text-sm">
            Chat is now open
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

function AppHeader({ onExit, right }) {
  return (
    <header className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-white/5">
      <Logo size="text-lg" />
      <div className="flex items-center gap-3">
        {right}
        <button
          type="button"
          onClick={onExit}
          className="text-xs text-mist hover:text-cream"
        >
          Exit
        </button>
      </div>
    </header>
  )
}

function HomeScreen({ privacyMode, onScreen }) {
  return (
    <div className="space-y-5 py-3">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
          @rolling_pines
        </p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream">
          Hey, Sarah.
        </h1>
        <p className="font-serif italic text-flame text-base leading-snug">
          Meet the right neighbors without making it weird.
        </p>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Open when you want. Invisible when you do not.
        </p>
      </header>

      <div className="rounded-xl border border-white/5 bg-card px-3 py-2 flex items-center gap-3">
        <ModeBadge mode={privacyMode} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-mist">Privacy</p>
          <p className="text-sm font-semibold text-cream capitalize">{privacyMode}</p>
        </div>
        <button
          type="button"
          onClick={() => onScreen('privacy')}
          className="text-xs font-semibold text-flame underline-offset-2 hover:underline"
        >
          Change
        </button>
      </div>

      <div className="space-y-2">
        <Eyebrow>Where the action is</Eyebrow>
        <Tile title="Check in" description="Scan the campground QR." onClick={() => onScreen('checkin')} />
        <Tile title="Nearby campers" description="Who else is here right now." onClick={() => onScreen('nearby')} />
        <Tile title="Meetup spots" description="Activities posted by your campground." onClick={() => onScreen('meetups')} />
        <Tile title="Crossed paths" description="Mutual waves you've made." onClick={() => onScreen('paths')} />
      </div>
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
  travelStyle,
  onTravelStyle,
  chosenInterests,
  onToggleInterest,
  privacyMode,
  onPrivacy,
  onCheckedIn,
}) {
  return (
    <div className="space-y-6 py-3">
      <header className="space-y-2">
        <Eyebrow>Check in</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Where are you parked?
        </h1>
        <p className="font-serif italic text-flame text-base leading-snug">
          24 hours, then you&apos;re invisible again.
        </p>
      </header>

      <div className="rounded-2xl border border-flame/30 bg-flame/10 p-4">
        <p className="text-[11px] uppercase tracking-wide text-flame">Check in to</p>
        <h2 className="font-display text-xl font-extrabold tracking-tight text-cream">
          Riverbend RV Park
        </h2>
        <p className="text-xs text-mist">Asheville, NC</p>
      </div>

      <Section eyebrow="Travel style" hint="Pick one. Tap again to clear.">
        <div className="flex flex-wrap gap-1.5">
          {TRAVEL_STYLES.map((s) => {
            const active = travelStyle === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => onTravelStyle(active ? '' : s)}
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

function NearbyScreen({ waved, onWave, myStyle }) {
  const [filterStyle, setFilterStyle] = useState(null)
  const [filterInterest, setFilterInterest] = useState(null)

  const list = useMemo(() => {
    return SAMPLE_CAMPERS.filter((c) => {
      if (filterStyle && c.style !== filterStyle) return false
      if (filterInterest && !c.interests.includes(filterInterest)) return false
      return true
    })
  }, [filterStyle, filterInterest])

  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Currently at Riverbend RV Park</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Nearby campers
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Wave when the vibe feels right.
        </p>
      </header>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          Travel style
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TRAVEL_STYLES.map((s) => {
            const active = filterStyle === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStyle(active ? null : s)}
                className={
                  active
                    ? 'rounded-full bg-flame px-2.5 py-1 text-[11px] font-semibold text-night'
                    : 'rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-cream'
                }
              >
                {s}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-flame font-semibold">
          Interest
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INTERESTS.map((i) => {
            const active = filterInterest === i.slug
            return (
              <button
                key={i.slug}
                type="button"
                onClick={() => setFilterInterest(active ? null : i.slug)}
                className={
                  active
                    ? 'inline-flex items-center gap-1 rounded-full bg-flame px-2.5 py-1 text-[11px] font-semibold text-night'
                    : 'inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-cream'
                }
              >
                <span aria-hidden>{i.emoji}</span>
                {i.label}
              </button>
            )
          })}
        </div>
      </div>

      <ul className="space-y-2.5">
        {list.map((c) => (
          <li key={c.id}>
            <CamperCard camper={c} state={waved[c.id]} onWave={() => onWave(c.id)} />
          </li>
        ))}
        {list.length === 0 && (
          <li className="rounded-xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-xs text-mist">
            No campers match those filters. {myStyle ? `(You picked ${myStyle}.)` : ''}
          </li>
        )}
      </ul>
    </div>
  )
}

function CamperCard({ camper, state, onWave }) {
  return (
    <article className="rounded-2xl border border-white/5 bg-card p-3 shadow-lg shadow-black/20 space-y-2">
      <header>
        <h3 className="text-sm font-semibold text-cream">{camper.name}</h3>
        <p className="text-[11px] text-mist">@{camper.username}</p>
        <span className="mt-1 inline-flex items-center rounded-full border border-flame/30 bg-flame/10 px-2 py-0.5 text-[10px] font-semibold text-flame">
          {camper.style}
        </span>
        {camper.status && (
          <p className="mt-1.5 font-serif italic text-flame text-sm leading-snug">
            &ldquo;{camper.status}&rdquo;
          </p>
        )}
      </header>

      <div className="flex flex-wrap gap-1">
        <Pill label="Rig" value={camper.rig} />
        <Pill label="From" value={camper.from} />
        <Pill label="Years" value={camper.years.toString()} />
      </div>

      <ul className="flex flex-wrap gap-1">
        {camper.interests.map((slug) => (
          <li
            key={slug}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream"
          >
            <span aria-hidden>{INTEREST_EMOJI[slug]}</span>
            {INTEREST_LABEL[slug]}
          </li>
        ))}
      </ul>

      <div className="pt-1.5 border-t border-white/5">
        {state === 'matched' ? (
          <div className="rounded-lg border border-flame/40 bg-flame/15 px-3 py-1.5 text-center text-xs font-semibold text-flame">
            <span aria-hidden>👋</span> Crossed paths
          </div>
        ) : state === 'waved' ? (
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
// Meetups
// ----------------------------------------------------------------------------

function MeetupsScreen() {
  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Riverbend RV Park hosts</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          Meetup spots
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Coffee, fires, music. Show up if you want.
        </p>
      </header>

      <ul className="space-y-2">
        {MEETUPS.map((m) => (
          <li
            key={m.id}
            className="rounded-2xl border border-white/5 bg-card p-3 shadow-lg shadow-black/20"
          >
            <h3 className="text-sm font-semibold text-cream leading-tight">{m.title}</h3>
            <p className="text-[11px] text-mist mt-0.5">{m.time}</p>
            <span className="mt-1.5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream">
              {m.location}
            </span>
            <p className="mt-2 text-xs text-cream/90 leading-snug">{m.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Privacy modes
// ----------------------------------------------------------------------------

function PrivacyScreen({ mode, onChange }) {
  return (
    <div className="space-y-4 py-3">
      <header>
        <Eyebrow>Privacy mode</Eyebrow>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-cream leading-tight">
          How visible are you?
        </h1>
        <p className="font-serif italic text-flame text-sm leading-snug">
          Three settings. You&apos;re always in control.
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
                {m.slug === 'visible' ? '👁' : m.slug === 'quiet' ? '🤫' : '👻'}
              </span>
              <span>
                <span className="block text-sm font-semibold text-cream">{m.label}</span>
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

function CrossedPathsScreen({ waved }) {
  // Pull in any matches the user just made in the demo session
  const sessionMatches = SAMPLE_CAMPERS.filter((c) => waved[c.id] === 'matched').map(
    (c) => ({
      name: c.name,
      username: c.username,
      campground: 'Riverbend RV Park',
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
          People who waved back.
        </p>
      </header>

      {all.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-4 text-center text-xs text-mist">
          Try waving at someone in the Nearby tab. Sarah & Jim wave back.
        </p>
      ) : (
        <ul className="space-y-2">
          {all.map((p, i) => (
            <li
              key={i}
              className="rounded-2xl border border-flame/30 bg-card p-3 shadow-lg shadow-black/20"
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
            </li>
          ))}
        </ul>
      )}
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
  }
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${styles[mode]}`}
    >
      {mode}
    </span>
  )
}
