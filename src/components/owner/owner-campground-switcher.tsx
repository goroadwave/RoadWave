'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { OwnerMembership } from '@/app/owner/(authed)/_helpers'
import { selectOwnerCampgroundAction } from '@/app/owner/(authed)/select-campground-action'

// Header switcher for owners who manage more than one campground.
// Custom button + dropdown panel (not a native <select>) so the
// affordance is unmistakable across desktop and mobile and so the
// brand styling carries through. The popover lists every campground
// the owner manages; tapping one calls selectOwnerCampgroundAction
// with the chosen id, which validates against campground_admins,
// writes the owner_cg cookie, revalidates the owner shell, and
// redirects to /owner/dashboard.
//
// Solo-owner case (memberships.length === 1) renders a plain
// "Viewing: <name>" label -- nothing to pick, no chrome wasted.
//
// Zero-memberships case renders nothing (the owner layout already
// redirects to /owner/setup before reaching here).

type Props = {
  memberships: OwnerMembership[]
  currentCampgroundId: string | null
}

export function OwnerCampgroundSwitcher({
  memberships,
  currentCampgroundId,
}: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (buttonRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (memberships.length === 0) return null

  const current =
    memberships.find((m) => m.campground_id === currentCampgroundId) ??
    memberships[0]!
  const currentName = current.name

  // Solo: no picker. Just shows which campground you're viewing.
  if (memberships.length === 1) {
    return (
      <div className="text-[11px] text-mist whitespace-nowrap max-w-[180px] sm:max-w-none truncate">
        Viewing:{' '}
        <span className="text-cream font-medium">{currentName}</span>
      </div>
    )
  }

  function handlePick(id: string) {
    if (id === current.campground_id) {
      setOpen(false)
      return
    }
    // Server action via FormData. useTransition keeps the click
    // feedback fast; the action redirects to /owner/dashboard on
    // success so we never need to re-close the panel here.
    const fd = new FormData()
    fd.set('campground_id', id)
    startTransition(() => {
      void selectOwnerCampgroundAction(fd)
    })
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch campground (currently ${currentName})`}
        className="inline-flex items-center gap-1.5 rounded-md border border-flame/40 bg-flame/10 text-cream text-xs px-2.5 py-1.5 hover:bg-flame/15 hover:border-flame/60 transition-colors max-w-[220px] sm:max-w-[300px]"
      >
        <span className="text-[10px] uppercase tracking-wider text-flame shrink-0">
          Campground
        </span>
        <span className="truncate font-semibold">{currentName}</span>
        <span aria-hidden className="text-flame shrink-0 text-[10px]">
          ▼
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Switch active campground"
          className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/40 z-50 overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-white/5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-flame font-semibold">
              Your campgrounds ({memberships.length})
            </p>
          </div>
          <ul className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {memberships.map((m) => {
              const isCurrent = m.campground_id === current.campground_id
              return (
                <li key={m.campground_id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handlePick(m.campground_id)}
                    disabled={pending}
                    className={
                      isCurrent
                        ? 'w-full text-left px-4 py-3 bg-flame/10 cursor-default'
                        : 'w-full text-left px-4 py-3 hover:bg-white/[0.04] disabled:opacity-50 transition-colors'
                    }
                  >
                    <span className="flex items-start gap-2">
                      <span
                        aria-hidden
                        className={
                          isCurrent
                            ? 'mt-0.5 text-flame'
                            : 'mt-0.5 text-transparent'
                        }
                      >
                        ✓
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={
                            isCurrent
                              ? 'block text-sm font-semibold text-flame leading-tight truncate'
                              : 'block text-sm font-semibold text-cream leading-tight truncate'
                          }
                        >
                          {m.name}
                        </span>
                        <span className="block text-[11px] text-mist mt-0.5 truncate">
                          /{m.slug}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
