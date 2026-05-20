'use client'

import { useState } from 'react'

// Copy-to-clipboard button used on each owner inbox card next to the
// guest's phone number. Desktop staff use this to read the number off
// the screen + dial from the office phone; the previous tel: button
// tried to launch a phone app that doesn't exist on a desktop browser.
//
// Mobile staff still get a tel: link, but it's gated behind a CSS
// (hover: none) and (pointer: coarse) media query so it only renders
// on touch devices -- the office-desk workflow stays "show and copy."

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  // Standard US 10-digit: 555-123-4567. 11-digit with leading 1: 1 555-123-4567.
  // Anything else (international, extensions, partials) renders as-is
  // so we never mangle a guest-provided number we don't understand.
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw
}

export function OwnerMessageCopyNumber({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formatted = formatPhone(phone)
  const dialDigits = phone.replace(/[^0-9+]/g, '')

  async function copy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(formatted)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Copy failed — select and copy manually.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-leaf/25 bg-leaf/[0.05] px-3 py-2">
      <span className="text-[10px] uppercase tracking-[0.18em] text-leaf/80 font-semibold">
        Phone
      </span>
      <span className="font-mono text-sm font-semibold text-cream select-all tabular-nums">
        {formatted}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-md border border-leaf/40 bg-leaf/10 text-leaf px-2.5 py-1 text-[11px] font-semibold hover:bg-leaf/15 transition-colors"
      >
        <span aria-hidden>{copied ? '✓' : '⧉'}</span>
        {copied ? 'Copied' : 'Copy Number'}
      </button>
      {/* tel: kept ONLY for touch / coarse-pointer devices (phones,
          tablets). Desktop browsers hide it entirely so a click on a
          laptop never launches a useless phone-app handler.
          The mobile-tel-only utility lives in globals.css -- using a
          Tailwind v4 arbitrary-variant media query here generated
          invalid CSS (missing space in `(coarse)and(none)`) that
          crashed the parser. */}
      <a
        href={`tel:${dialDigits}`}
        className="mobile-tel-only items-center gap-1.5 rounded-md border border-leaf/40 bg-leaf/10 text-leaf px-2.5 py-1 text-[11px] font-semibold hover:bg-leaf/15 transition-colors"
      >
        <span aria-hidden>📞</span>
        Call (mobile)
      </a>
      {error && <span className="text-[11px] text-red-300">{error}</span>}
    </div>
  )
}
