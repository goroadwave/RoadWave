'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Lightweight owner-pitch modal. The previous heavy version
// (300+ lines, 5 sections, B/C/D/E expandables) was deleted in
// 53af9e5; this is the focused replacement: pitch + a single green
// Start My Campground Pilot CTA + the price line.
//
// Self-contained: renders both the trigger and the modal. Two trigger
// styles via the `variant` prop:
//
//   * "hero-card" (default) — bordered card sized for the homepage
//     audience-split row alongside the For-campers card.
//   * "footer-link" — the styled column header text used in the footer
//     to replace the explicit Campground Owners 5-link column. Lives
//     in the same column slot as Guests/Legal/Contact.
//
// Each instance of the component has its own `open` state, so dropping
// it into both surfaces is fine — they don't share state.
//
// Behavior in either variant:
//   - Click the trigger -> open modal
//   - Click backdrop / press Escape / click X -> close
//   - Body scroll is locked while open
//   - Click the green Start CTA -> navigate to /start AND close modal

type Props = {
  variant?: 'hero-card' | 'footer-link'
}

export function OwnerInfoModal({ variant = 'hero-card' }: Props = {}) {
  const [open, setOpen] = useState(false)

  // Lock body scroll + Escape to close while open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const trigger =
    variant === 'footer-link' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame hover:text-amber-300 transition-colors inline-flex items-center gap-1.5"
      >
        Campground Owners
        <span aria-hidden className="text-base leading-none font-normal">
          →
        </span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="block w-full text-left rounded-2xl border border-flame/30 bg-flame/[0.04] p-6 space-y-3 hover:border-flame/60 hover:bg-flame/[0.08] transition-colors"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-flame">
          For campground owners
        </p>
        <h2 className="font-display text-xl sm:text-2xl font-extrabold text-cream leading-tight">
          Give your guests a private way to connect and stay updated
        </h2>
        <p className="text-sm text-mist leading-relaxed">
          A branded guest page powered by your QR code — bulletins,
          meetups, and shared-interest discovery without exact site
          numbers or public group chat.
        </p>
        <p className="text-sm font-semibold text-flame pt-1">
          Learn more <span aria-hidden>→</span>
        </p>
      </button>
    )

  return (
    <>
      {trigger}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="For campground owners"
          className="fixed inset-0 z-[100] flex items-stretch sm:items-center sm:justify-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute inset-0 bg-night/95 backdrop-blur"
            aria-hidden
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl bg-night border border-flame/30 shadow-2xl shadow-black/70 flex flex-col"
          >
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

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 space-y-5 text-cream">
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                A branded campground guest page powered by your QR code.
              </h2>
              <p className="text-sm sm:text-base text-mist leading-relaxed">
                Guests scan your QR and land on a page connected to your
                campground — bulletins, meetups, shared-interest discovery,
                and four privacy modes (Visible, Quiet, Invisible, or
                Campground Updates Only). All without exact site numbers
                or public group chat.
              </p>

              <Link
                href="/start"
                onClick={() => setOpen(false)}
                className="block w-full text-center rounded-xl bg-[#4caf82] text-night px-6 py-3 text-sm font-semibold shadow-md shadow-[#4caf82]/20 hover:bg-[#3f9d72] transition-colors"
              >
                Start My Campground Pilot
              </Link>

              <p className="text-xs text-mist/70 text-center">
                $39/month founding rate · cancel anytime · no hardware ·
                no app store
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
