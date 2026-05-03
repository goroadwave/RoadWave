'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Footer "Campground Owners" entry point. Tapping the trigger opens
// a full-screen overlay (true sheet on mobile, centered card on >=sm)
// that holds the full owner pitch + onboarding content. Sticky header
// with the X close button so the close affordance is always visible
// regardless of how far the body has scrolled. Backdrop click +
// Escape both close the modal; body scroll is locked while open.

const OWNER_PITCH_BULLETS: string[] = [
  'Branded campground guest page',
  'Campground bulletins and meetup prompts',
  'Campground Updates Only for private guests',
  'Privacy-safe owner dashboard with engagement stats',
]

const OWNER_HOW_FOR_YOU: { title: string; body: string }[] = [
  {
    title: '1. Your branded guest page',
    body: 'Guests scan your QR code and land on a page connected to your campground — your branding, your bulletins, your meetups.',
  },
  {
    title: '2. Your QR code',
    body: 'Print and place at check-in, the office window, the bulletin board, or the bath houses. No app download required for guests.',
  },
  {
    title: '3. Your front-desk script',
    body: 'One sentence at check-in: “Scan the QR at the office to see what’s happening this weekend.”',
  },
  {
    title: '4. Your admin dashboard',
    body: 'Post bulletins, meetup prompts, and see privacy-safe engagement stats — without seeing private guest details.',
  },
]

const OWNER_HOW_FOR_GUESTS: { title: string; body: string }[] = [
  {
    title: '1. Guest scans the QR code',
    body: 'Lands on your branded guest page instantly. No download, no account required just to look around.',
  },
  {
    title: '2. Guest checks in',
    body: 'Picks travel style and interests. Check-in expires automatically after 24 hours.',
  },
  {
    title: '3. Guest chooses a privacy mode',
    body: 'Visible, Quiet, Invisible, or Campground Updates Only. They can switch any time, in one tap.',
  },
  {
    title: '4. Guest sees your bulletins and meetup prompts',
    body: 'One easy place for everything happening at your campground today.',
  },
  {
    title: '5. Guest browses campers who share their interests (optional)',
    body: 'No exact site numbers shown. Browsing is opt-in via Visible or Quiet mode.',
  },
  {
    title: '6. Optional wave',
    body: 'A private hello only opens when both people wave. No public group chat, no comment threads.',
  },
]

const OWNER_PRIVACY_SAFETY: { title: string; body: string }[] = [
  {
    title: 'No exact site numbers',
    body: 'Site numbers are never displayed in the app. Guests can share their site 1:1 via private hello after a mutual wave — never publicly.',
  },
  {
    title: 'No public group chat',
    body: "Guests can't post to a public feed. Bulletins go from you to all checked-in guests; private hellos only open after both sides wave.",
  },
  {
    title: '18+ required',
    body: "Guests confirm they're 18 or older during signup. Underage accounts are removed.",
  },
  {
    title: 'Campground Updates Only mode',
    body: "Guests who want only your bulletins and meetups can pick Campground Updates Only — they're invisible to other campers and can't send or receive waves.",
  },
  {
    title: 'You are not responsible for guest-to-guest interactions after a mutual wave',
    body: "Once two guests have mutually waved and a private hello is open, that conversation is between them. Your campground isn't the host of the conversation.",
  },
]

export function OwnerInfoModal() {
  const [open, setOpen] = useState(false)

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-cream/90 hover:text-flame transition-colors text-left"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Campground Owners
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Information for campground owners"
          className="fixed inset-0 z-[100] flex items-stretch sm:items-center sm:justify-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-0 bg-night/95 backdrop-blur"
            aria-hidden
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl bg-night border border-flame/30 shadow-2xl shadow-black/70 flex flex-col"
          >
            {/* Sticky header with X — always visible, always tappable. */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-night/95 backdrop-blur px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
                For campground owners
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-full bg-card border border-white/15 text-cream hover:border-flame/60 hover:text-flame transition-colors"
              >
                <span aria-hidden className="text-base leading-none">
                  ✕
                </span>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 space-y-8 text-cream">
              {/* A. Pitch */}
              <section className="space-y-4">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-cream leading-tight">
                  A branded campground guest page powered by your QR code.
                </h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {OWNER_PITCH_BULLETS.map((b) => (
                    <li
                      key={b}
                      className="rounded-xl border border-white/5 bg-card px-3 py-2 text-sm flex items-start gap-2"
                    >
                      <span className="text-flame mt-0.5" aria-hidden>
                        ✓
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {/* Try-before-you-buy: secondary path for owners who
                    want to feel the product before opening the wallet.
                    Sits between the pitch bullets and the price/Get
                    Started CTA. */}
                <Link
                  href="/demo"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center rounded-xl border border-flame/40 bg-white/5 text-cream px-5 py-3 text-sm font-semibold hover:bg-flame/10 hover:border-flame/60 transition-colors"
                >
                  Try the Demo first <span aria-hidden>👋</span>
                </Link>
                <div className="rounded-xl border border-flame/30 bg-flame/[0.06] p-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
                      Founding rate
                    </p>
                    <p className="font-semibold text-lg">
                      $39
                      <span className="text-mist text-sm font-medium">
                        /month
                      </span>
                    </p>
                  </div>
                  <Link
                    href="/start"
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4caf82] text-night px-5 py-2.5 text-sm font-semibold shadow-md shadow-[#4caf82]/20 hover:bg-[#3f9d72] transition-colors"
                  >
                    Get Started <span aria-hidden>→</span>
                  </Link>
                </div>
              </section>

              <ModalSection
                eyebrow="How it works for you"
                title="Your owner steps"
                items={OWNER_HOW_FOR_YOU}
              />

              <ModalSection
                eyebrow="How it works for your guests"
                title="Your guest steps"
                items={OWNER_HOW_FOR_GUESTS}
              />

              {/* D. What You Can / Cannot See */}
              <section className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
                  What you can and cannot see
                </p>
                <h3 className="font-display text-xl font-extrabold leading-tight">
                  Privacy-safe by design
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-flame/30 bg-card p-4">
                    <p className="text-sm font-semibold mb-2">
                      What you can see
                    </p>
                    <ul className="text-sm text-mist list-disc list-inside space-y-1">
                      <li>QR code scans</li>
                      <li>Guest check-ins</li>
                      <li>Bulletin views</li>
                      <li>Meetup interest</li>
                      <li>Popular guest interests</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-card p-4">
                    <p className="text-sm font-semibold mb-2">
                      What you cannot see
                    </p>
                    <ul className="text-sm text-mist list-disc list-inside space-y-1">
                      <li>Private messages</li>
                      <li>Exact site numbers</li>
                      <li>Who waved at whom</li>
                      <li>Guest-to-guest conversations</li>
                      <li>Exact guest locations</li>
                    </ul>
                  </div>
                </div>
              </section>

              <ModalSection
                eyebrow="Privacy and safety"
                title="The guardrails"
                items={OWNER_PRIVACY_SAFETY}
              />

              {/* Footer CTA inside the modal — second chance to convert. */}
              <div className="rounded-xl border border-flame/30 bg-flame/[0.06] p-4 text-center">
                <Link
                  href="/start"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4caf82] text-night px-6 py-3 font-semibold shadow-md shadow-[#4caf82]/20 hover:bg-[#3f9d72] transition-colors"
                >
                  Get Started <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ModalSection({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string
  title: string
  items: { title: string; body: string }[]
}) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
        {eyebrow}
      </p>
      <h3 className="font-display text-xl font-extrabold leading-tight">
        {title}
      </h3>
      <div className="space-y-2">
        {items.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-white/10 bg-card p-4"
          >
            <p className="text-sm font-semibold text-cream mb-1">{s.title}</p>
            <p className="text-sm text-mist leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
