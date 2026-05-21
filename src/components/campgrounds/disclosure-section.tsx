import type { ReactNode } from 'react'

// Phase 4b -- accordion / disclosure wrapper for the camper QR page's
// secondary sections (Rules, Amenities, Local Recs, Support This
// Campground, Meet Other Campers). Built on the native
// <details>/<summary> HTML elements:
//
//   * Hydration-safe -- no React state, no useEffect, no first-render
//     vs second-render flip. SSR renders the exact final DOM.
//   * Free keyboard support -- Enter / Space toggle, focus ring,
//     screen-reader announces expanded / collapsed state.
//   * Default-closed via the open attribute (passed as defaultOpen
//     prop). Per the Phase 4b spec these default to closed for a
//     cleaner page.
//   * Mobile-friendly tap target -- summary is the full-width
//     header row (44px+ tap area).
//
// Styling matches the rounded-2xl border/bg-card pattern used
// elsewhere on the page. The chevron rotates via the open: variant
// (Tailwind v4 :open pseudo-class targeting).

export function DisclosureSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-2xl border border-white/5 bg-card/40 overflow-hidden open:bg-card/60"
    >
      <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 sm:py-4 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors min-h-[44px]">
        <div className="min-w-0 space-y-0.5">
          <span className="block text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
            {title}
          </span>
          {description && (
            <span className="block text-xs text-mist leading-snug">
              {description}
            </span>
          )}
        </div>
        {/* group-open targets the parent <details>'s :open pseudo-class
            (Tailwind v4 supports this natively). On the rare browser
            that doesn't, the chevron just doesn't rotate -- the
            accordion still works. */}
        <span
          aria-hidden
          className="shrink-0 text-mist transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1 space-y-3">
        {children}
      </div>
    </details>
  )
}
