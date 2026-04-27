'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

type Mood =
  | 'curious'
  | 'confident'
  | 'ghost'
  | 'waving'
  | 'jumping'
  | 'shrug'
  | 'campfire'
  | 'thumbs-up'

type Slide = {
  id: string
  eyebrow: string
  title: string
  body: string
  mood: Mood
}

const SLIDES: Slide[] = [
  {
    id: 'arrive',
    eyebrow: 'Arrive',
    title: 'You just pulled in.',
    body: "New campground. New neighbors. Adventure or awkward? Let's find out.",
    mood: 'curious',
  },
  {
    id: 'vibe',
    eyebrow: 'Pick your vibe',
    title: 'Who are you today?',
    body: 'Full-timer? Weekend warrior? Solo wolf? Pick your style.',
    mood: 'confident',
  },
  {
    id: 'invisible',
    eyebrow: 'Go invisible',
    title: 'Not feeling social?',
    body: 'You are a ghost. A very well-rested ghost. Nobody sees you. Nobody wants to.',
    mood: 'ghost',
  },
  {
    id: 'wave',
    eyebrow: 'Send a wave',
    title: 'Spot someone cool?',
    body: 'No messages. No awkwardness. Just a friendly wave across the campground.',
    mood: 'waving',
  },
  {
    id: 'match',
    eyebrow: 'They wave back',
    title: 'They waved back!',
    body: "Now you're talking. Literally. A chat opens automatically.",
    mood: 'jumping',
  },
  {
    id: 'miss',
    eyebrow: 'Invisible miss',
    title: "Didn't wave back?",
    body: 'Nobody knows. Zero cringe. You were a ghost, remember?',
    mood: 'shrug',
  },
  {
    id: 'meetup',
    eyebrow: 'Meet up',
    title: 'From wave to campfire in minutes.',
    body: 'Real people, right outside your door.',
    mood: 'campfire',
  },
  {
    id: 'cta',
    eyebrow: 'Ready to roll?',
    title: 'Join the journey.',
    body: 'Built for full-timers, weekenders, and everyone in between.',
    mood: 'thumbs-up',
  },
]

export default function TourPage() {
  const [index, setIndex] = useState(0)
  const total = SLIDES.length
  const slide = SLIDES[index]

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total - 1))
  }, [total])

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  const isLast = index === total - 1

  return (
    <main className="min-h-screen bg-night text-cream font-sans flex flex-col">
      <TourStyles />

      {/* Progress bar */}
      <div className="px-4 pt-4 flex items-center gap-1.5">
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= index ? 'bg-flame' : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Exit
        </Link>
        <span className="text-xs text-mist tabular-nums">
          {index + 1} / {total}
        </span>
      </header>

      {/* Slide content */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-4">
        <div
          key={slide.id}
          className="slide-enter w-full max-w-md flex flex-col items-center gap-6"
        >
          <div className="h-64 sm:h-72 w-full flex items-end justify-center">
            <RverCharacter mood={slide.mood} />
          </div>

          <div className="text-center space-y-2 px-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-flame">
              {slide.eyebrow}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-[1.1]">
              {slide.title}
            </h1>
            <p className="font-serif italic text-flame text-base sm:text-lg leading-snug pt-1">
              {slide.body}
            </p>
          </div>
        </div>
      </section>

      {/* Footer / Nav */}
      <div className="p-4 pb-6 flex items-center gap-3 max-w-md w-full mx-auto">
        {!isLast && (
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="rounded-xl border border-flame/40 bg-transparent text-flame px-4 py-2.5 text-sm font-semibold hover:bg-flame/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
        )}

        <div className="flex-1" />

        {!isLast ? (
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            Next
          </button>
        ) : (
          <CtaRow />
        )}
      </div>
    </main>
  )
}

function CtaRow() {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors flex-1"
      >
        Get Started <span aria-hidden>👋</span>
      </Link>
      <Link
        href="/demo"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 hover:border-flame/40 transition-colors flex-1"
      >
        Try the Demo <span aria-hidden>→</span>
      </Link>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Character SVG — single component, mood drives which parts show + animate
// ----------------------------------------------------------------------------

function RverCharacter({ mood }: { mood: Mood }) {
  return (
    <svg
      viewBox="0 0 220 280"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMax meet"
      className={`character mood-${mood}`}
      aria-label={`Character — ${mood}`}
      role="img"
    >
      {/* Optional accessories drawn behind the character */}
      <g className="campfire" transform="translate(110, 240)">
        <ellipse cx="0" cy="6" rx="34" ry="6" fill="#0f172a" />
        {/* Logs */}
        <rect
          x="-22"
          y="0"
          width="44"
          height="7"
          rx="3"
          fill="#78350f"
          transform="rotate(-12)"
        />
        <rect
          x="-22"
          y="0"
          width="44"
          height="7"
          rx="3"
          fill="#92400e"
          transform="rotate(12)"
        />
        {/* Flames */}
        <path
          className="flame outer"
          d="M -16 -2 Q -22 -22 -8 -22 Q 0 -38 8 -22 Q 22 -22 16 -2 Q 12 6 0 6 Q -12 6 -16 -2 Z"
          fill="#f59e0b"
        />
        <path
          className="flame inner"
          d="M -8 -4 Q -12 -18 -4 -18 Q 0 -28 4 -18 Q 12 -18 8 -4 Q 6 4 0 4 Q -6 4 -8 -4 Z"
          fill="#fbbf24"
        />
        <path
          className="flame core"
          d="M -3 -6 Q -5 -14 0 -14 Q 5 -14 3 -6 Q 2 0 0 0 Q -2 0 -3 -6 Z"
          fill="#fef3c7"
        />
      </g>

      {/* Whole-character group; some moods translate or scale this */}
      <g className="character-body">
        {/* Pants (drawn first so shirt overlaps) */}
        <g className="legs">
          <rect x="84" y="200" width="16" height="46" rx="6" fill="#475569" />
          <rect x="120" y="200" width="16" height="46" rx="6" fill="#475569" />
          {/* Boots */}
          <rect x="80" y="240" width="22" height="10" rx="3" fill="#1f2937" />
          <rect x="118" y="240" width="22" height="10" rx="3" fill="#1f2937" />
        </g>

        {/* Torso */}
        <rect
          className="torso"
          x="74"
          y="128"
          width="72"
          height="80"
          rx="22"
          fill="#b45309"
        />
        {/* Shirt highlight */}
        <rect
          x="100"
          y="135"
          width="20"
          height="60"
          rx="8"
          fill="#92400e"
          opacity="0.5"
        />

        {/* Left arm (character-left, viewer-right side is character's right) */}
        <g className="arm arm-left">
          <rect x="62" y="132" width="18" height="58" rx="9" fill="#b45309" />
          <circle cx="71" cy="190" r="10" fill="#f5d4a8" />
        </g>

        {/* Right arm (the waving/thumbs-up arm) */}
        <g className="arm arm-right">
          <rect x="140" y="132" width="18" height="58" rx="9" fill="#b45309" />
          <circle cx="149" cy="190" r="10" fill="#f5d4a8" />
          {/* Thumb (only shows in thumbs-up mood) */}
          <rect className="thumb" x="155" y="178" width="6" height="14" rx="3" fill="#f5d4a8" />
        </g>

        {/* Marshmallow stick (only shows in campfire mood) */}
        <g className="marshmallow">
          <line x1="149" y1="190" x2="118" y2="232" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
          <circle cx="118" cy="232" r="6" fill="#fef3c7" />
          <circle cx="120" cy="230" r="2" fill="#a16207" opacity="0.5" />
        </g>

        {/* Head + cap group */}
        <g className="head">
          {/* Skin */}
          <circle cx="110" cy="78" r="42" fill="#f5d4a8" />

          {/* Hair peek under cap */}
          <path
            d="M 70 70 Q 80 55 110 53 Q 140 55 150 70 Z"
            fill="#3f2a18"
          />

          {/* Cap dome */}
          <g className="cap">
            <path
              d="M 70 60 Q 70 24 110 24 Q 150 24 150 60 Z"
              fill="#f59e0b"
            />
            {/* Cap button */}
            <circle cx="110" cy="30" r="3.5" fill="#fbbf24" />
            {/* Cap front panel seam */}
            <line
              x1="110"
              y1="28"
              x2="110"
              y2="60"
              stroke="#c2410c"
              strokeWidth="1.5"
              opacity="0.4"
            />
            {/* Cap bill */}
            <ellipse cx="110" cy="62" rx="50" ry="7" fill="#c2410c" />
          </g>

          {/* Default eyes (open) */}
          <g className="eyes-default">
            <circle cx="94" cy="82" r="4" fill="#0a0f1c" />
            <circle cx="126" cy="82" r="4" fill="#0a0f1c" />
            {/* Catchlights */}
            <circle cx="95.3" cy="80.7" r="1.2" fill="#f5ecd9" />
            <circle cx="127.3" cy="80.7" r="1.2" fill="#f5ecd9" />
          </g>

          {/* Wink eyes (left open, right winking) */}
          <g className="eyes-wink">
            <circle cx="94" cy="82" r="4" fill="#0a0f1c" />
            <circle cx="95.3" cy="80.7" r="1.2" fill="#f5ecd9" />
            <path
              d="M 119 83 Q 126 78 133 83"
              stroke="#0a0f1c"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </g>

          {/* Big excited eyes */}
          <g className="eyes-big">
            <circle cx="94" cy="82" r="6" fill="#0a0f1c" />
            <circle cx="126" cy="82" r="6" fill="#0a0f1c" />
            <circle cx="96" cy="80" r="2" fill="#f5ecd9" />
            <circle cx="128" cy="80" r="2" fill="#f5ecd9" />
          </g>

          {/* Sunglasses */}
          <g className="sunglasses">
            <rect x="80" y="76" width="24" height="14" rx="4" fill="#0a0f1c" />
            <rect x="116" y="76" width="24" height="14" rx="4" fill="#0a0f1c" />
            <line x1="104" y1="83" x2="116" y2="83" stroke="#0a0f1c" strokeWidth="2.5" />
            {/* Lens shine */}
            <path d="M 84 79 L 90 79 L 86 85 Z" fill="#475569" opacity="0.7" />
            <path d="M 120 79 L 126 79 L 122 85 Z" fill="#475569" opacity="0.7" />
          </g>

          {/* Mouths */}
          <path
            className="mouth mouth-smile"
            d="M 96 100 Q 110 110 124 100"
            stroke="#0a0f1c"
            strokeWidth="2.8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            className="mouth mouth-big-smile"
            d="M 90 96 Q 110 116 130 96 Q 110 102 90 96 Z"
            fill="#0a0f1c"
            stroke="#0a0f1c"
            strokeWidth="1"
          />
          <line
            className="mouth mouth-straight"
            x1="98"
            y1="103"
            x2="122"
            y2="103"
            stroke="#0a0f1c"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle
            className="mouth mouth-whistle"
            cx="110"
            cy="103"
            r="3.5"
            fill="#0a0f1c"
          />
          {/* Whistle line above mouth */}
          <path
            className="whistle-puff"
            d="M 122 95 Q 132 90 138 96"
            stroke="#94a3b8"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />

          {/* Cheeks (jumping mood) */}
          <g className="cheeks">
            <circle cx="80" cy="92" r="5" fill="#fb7185" opacity="0.5" />
            <circle cx="140" cy="92" r="5" fill="#fb7185" opacity="0.5" />
          </g>
        </g>
      </g>

      {/* Floating heart (jumping mood) */}
      <g className="heart" transform="translate(170, 56)">
        <path
          d="M 0 6 C -10 -6 -22 6 0 22 C 22 6 10 -6 0 6 Z"
          fill="#ef4444"
        />
      </g>

      {/* Curiosity sparkles (curious mood) */}
      <g className="sparkles">
        <circle className="spark s1" cx="40" cy="60" r="2" fill="#fbbf24" />
        <circle className="spark s2" cx="180" cy="50" r="2" fill="#fbbf24" />
        <circle className="spark s3" cx="30" cy="120" r="1.5" fill="#fbbf24" />
      </g>
    </svg>
  )
}

// ----------------------------------------------------------------------------
// All character + slide CSS in one place. Inline so the route is portable.
// ----------------------------------------------------------------------------

function TourStyles() {
  return (
    <style>{`
      /* Slide enter transition */
      @keyframes slide-enter {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .slide-enter { animation: slide-enter 0.45s ease-out both; }

      /* ---- character defaults: hide all variant pieces, show via mood class ---- */
      .character .eyes-default,
      .character .eyes-wink,
      .character .eyes-big,
      .character .sunglasses,
      .character .mouth,
      .character .heart,
      .character .campfire,
      .character .marshmallow,
      .character .thumb,
      .character .cheeks,
      .character .whistle-puff,
      .character .sparkles { display: none; }

      .character { transition: transform 0.4s ease; }
      .character .arm,
      .character .head,
      .character .cap { transform-box: fill-box; transform-origin: center; }
      .character .arm-right { transform-origin: 149px 138px; transform-box: view-box; }
      .character .arm-left  { transform-origin: 71px 138px; transform-box: view-box; }
      .character .head      { transform-origin: 110px 110px; transform-box: view-box; }
      .character .cap       { transform-origin: 110px 60px; transform-box: view-box; }
      .character .character-body { transform-origin: 110px 240px; transform-box: view-box; }

      /* ====== mood-curious ====== */
      .mood-curious .eyes-default,
      .mood-curious .mouth-smile,
      .mood-curious .sparkles { display: block; }
      .mood-curious .head { animation: look-around 3.4s ease-in-out infinite; }
      .mood-curious .spark { animation: spark-blink 2s ease-in-out infinite; }
      .mood-curious .s2 { animation-delay: 0.5s; }
      .mood-curious .s3 { animation-delay: 1.1s; }
      @keyframes look-around {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-8deg); }
        75% { transform: rotate(8deg); }
      }
      @keyframes spark-blink {
        0%, 100% { opacity: 0; transform: scale(0.6); }
        50% { opacity: 1; transform: scale(1.2); }
      }

      /* ====== mood-confident ====== */
      .mood-confident .eyes-wink,
      .mood-confident .mouth-smile { display: block; }
      .mood-confident .character-body { animation: confident-bob 1.8s ease-in-out infinite; }
      @keyframes confident-bob {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-3px) scale(1.02); }
      }

      /* ====== mood-ghost ====== */
      .mood-ghost .sunglasses,
      .mood-ghost .mouth-straight { display: block; }
      .mood-ghost .character-body {
        transform: scale(0.85);
        transform-origin: 110px 250px;
        animation: tiptoe 1.6s ease-in-out infinite;
        opacity: 0.8;
      }
      @keyframes tiptoe {
        0%, 100% { transform: scale(0.85) translate(0px, 0); }
        25% { transform: scale(0.85) translate(-3px, -2px); }
        75% { transform: scale(0.85) translate(3px, -2px); }
      }

      /* ====== mood-waving ====== */
      .mood-waving .eyes-default,
      .mood-waving .mouth-smile { display: block; }
      .mood-waving .arm-right {
        animation: wave-arm 0.9s ease-in-out infinite;
      }
      @keyframes wave-arm {
        0%, 100% { transform: rotate(-110deg); }
        50% { transform: rotate(-150deg); }
      }

      /* ====== mood-jumping ====== */
      .mood-jumping .eyes-big,
      .mood-jumping .mouth-big-smile,
      .mood-jumping .heart,
      .mood-jumping .cheeks { display: block; }
      .mood-jumping .character-body { animation: jump 0.7s ease-in-out infinite; }
      .mood-jumping .heart { animation: heart-float 1.6s ease-out infinite; }
      @keyframes jump {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-22px); }
      }
      @keyframes heart-float {
        0% { transform: translate(170px, 56px) scale(0.5); opacity: 0; }
        30% { transform: translate(170px, 40px) scale(1); opacity: 1; }
        100% { transform: translate(170px, 0px) scale(0.7); opacity: 0; }
      }

      /* ====== mood-shrug ====== */
      .mood-shrug .eyes-default,
      .mood-shrug .mouth-whistle,
      .mood-shrug .whistle-puff { display: block; }
      .mood-shrug .arm-left { transform: rotate(-25deg); animation: shrug-bob 2.4s ease-in-out infinite; }
      .mood-shrug .arm-right { transform: rotate(25deg); animation: shrug-bob 2.4s ease-in-out infinite; }
      .mood-shrug .whistle-puff { animation: whistle-puff 1.4s ease-out infinite; transform-origin: 122px 95px; }
      @keyframes shrug-bob {
        0%, 100% { transform: rotate(var(--shrug, 0deg)) translateY(0); }
        50% { transform: rotate(var(--shrug, 0deg)) translateY(-3px); }
      }
      .mood-shrug .arm-left  { --shrug: -25deg; }
      .mood-shrug .arm-right { --shrug:  25deg; }
      @keyframes whistle-puff {
        0% { opacity: 0; transform: translate(-4px, 4px) scale(0.7); }
        50% { opacity: 1; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(8px, -8px) scale(1.2); }
      }

      /* ====== mood-campfire ====== */
      .mood-campfire .eyes-default,
      .mood-campfire .mouth-smile,
      .mood-campfire .campfire,
      .mood-campfire .marshmallow { display: block; }
      .mood-campfire .character-body {
        transform: translate(-26px, 4px);
      }
      .mood-campfire .arm-right { transform: rotate(35deg); transform-origin: 149px 138px; }
      .mood-campfire .flame.outer { animation: flame-flicker 0.6s ease-in-out infinite; transform-origin: 0 6px; }
      .mood-campfire .flame.inner { animation: flame-flicker 0.45s ease-in-out infinite reverse; transform-origin: 0 4px; }
      .mood-campfire .flame.core  { animation: flame-flicker 0.35s ease-in-out infinite; transform-origin: 0 0; }
      @keyframes flame-flicker {
        0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
        50% { transform: scaleY(1.12) scaleX(0.92); opacity: 0.85; }
      }

      /* ====== mood-thumbs-up ====== */
      .mood-thumbs-up .eyes-default,
      .mood-thumbs-up .mouth-big-smile,
      .mood-thumbs-up .thumb { display: block; }
      .mood-thumbs-up .arm-right {
        transform: rotate(-100deg);
        transform-origin: 149px 138px;
      }
      .mood-thumbs-up .cap { animation: cap-tip 1.8s ease-in-out 0.2s 1 both; }
      .mood-thumbs-up .character-body { animation: confident-bob 2s ease-in-out infinite; }
      @keyframes cap-tip {
        0%, 100% { transform: rotate(0deg) translateY(0); }
        20% { transform: rotate(-12deg) translateY(-2px); }
        40% { transform: rotate(-12deg) translateY(-2px); }
        60% { transform: rotate(0deg) translateY(0); }
      }

      /* Reduced-motion respect */
      @media (prefers-reduced-motion: reduce) {
        .character *, .slide-enter { animation: none !important; transition: none !important; }
      }
    `}</style>
  )
}
