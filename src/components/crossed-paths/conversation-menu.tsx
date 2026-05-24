'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeConnectionAction } from '@/app/(app)/crossed-paths/actions'
import { ReportDialog } from '@/components/report/report-dialog'

// Three-dot control menu for a Past Waves conversation. Replaces the
// standalone "Report" link in the conversation header and is also
// mounted under each card on the Past Waves listing so the camper
// can reach the same controls without opening the conversation
// first.
//
// Actions shipped 2026-05-24:
//   * Report -- opens the existing ReportDialog (preserves message
//     history for moderation review; does NOT delete anything).
//   * Remove Connection -- ends the mutual connection by calling
//     removeConnectionAction, which uses the wave_consent(_, false)
//     RPC to set crossed_paths.status='declined'. Confirmation
//     required. After remove:
//       - Future messages from either side are blocked by the
//         existing crossed_paths_messages RLS (sender must be a
//         participant on a non-declined row).
//       - The /crossed-paths/<id> page next visit lands on the
//         "Connection closed" branch.
//       - The Past Waves listing drops the entry on next render
//         (server filter already excludes declined).
//
// Not yet shipped (require additional schema -- see follow-up TODO):
//   * Block Camper -- needs a user_blocks table + a check in
//     nearby_campers + the waves insert RLS to also hide future
//     discovery / re-matching. Removing the connection covers the
//     primary "stop messaging" safety need; full Block needs more
//     surgery and is being held back to avoid another schema-cache
//     debug loop.
//   * Hide From My View -- per-camper visibility toggle without
//     ending the connection. Either localStorage (loses on
//     reinstall) or a hide_crossed_paths table. Held back for the
//     same reason; the user can use Remove Connection if they want
//     it off their list.
//
// UI: button toggles a small dropdown anchored under itself. Click-
// outside closes the menu. ARIA roles applied so screen readers
// announce the menu shape.

type Props = {
  crossedPathId: string
  otherUserId: string
  otherName: string
  campgroundId: string | null
  /** "header" gets a slightly larger button; "card" is the compact
   *  variant used on the Past Waves listing card next to Message. */
  variant?: 'header' | 'card'
  /** Where to send the camper after Remove Connection succeeds.
   *  Header variant pushes back to the listing so they aren't
   *  staring at a now-closed conversation. Card variant just
   *  router.refresh()es. */
  onRemovedHref?: string
}

export function ConversationMenu({
  crossedPathId,
  otherUserId,
  otherName,
  campgroundId,
  variant = 'header',
  onRemovedHref,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  function handleRemove() {
    const confirmed = window.confirm(
      `Remove your connection with ${otherName}? This ends messaging for both of you. Your message history is kept for safety/moderation but the conversation will be closed.`,
    )
    if (!confirmed) return
    setError(null)
    startTransition(async () => {
      const result = await removeConnectionAction(crossedPathId)
      if (!result.ok) {
        setError(result.error ?? 'Could not remove the connection.')
        return
      }
      setOpen(false)
      if (onRemovedHref) {
        router.push(onRemovedHref)
      } else {
        router.refresh()
      }
    })
  }

  const buttonCls =
    variant === 'header'
      ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-mist hover:text-cream hover:bg-white/[0.06] hover:border-white/20 transition-colors'
      : 'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-mist hover:text-cream hover:bg-white/[0.06] hover:border-white/20 transition-colors'

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          // Stop bubbling so we don't trigger an ancestor link
          // (e.g. the TappableCard wrapping the Past Waves listing).
          e.preventDefault()
          e.stopPropagation()
          setOpen((prev) => !prev)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Conversation actions for ${otherName}`}
        className={buttonCls}
      >
        <span aria-hidden className="text-lg leading-none">
          ⋯
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label={`Conversation actions for ${otherName}`}
          className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-card shadow-xl z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <ReportDialog
            reportedUserId={otherUserId}
            reportedLabel={otherName}
            campgroundId={campgroundId}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-4 py-3 text-sm text-cream hover:bg-white/[0.04] transition-colors flex items-center gap-2"
            >
              <span aria-hidden>🚩</span>
              Report
              <span className="ml-auto text-[10px] text-mist/70">
                preserves history
              </span>
            </button>
          </ReportDialog>

          <div className="border-t border-white/5" />

          <button
            type="button"
            role="menuitem"
            onClick={handleRemove}
            disabled={pending}
            className="w-full text-left px-4 py-3 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <span aria-hidden>✕</span>
            {pending ? 'Removing…' : 'Remove Connection'}
          </button>

          {error && (
            <p
              role="alert"
              className="px-4 py-2 text-[11px] text-red-300 border-t border-white/5 bg-red-500/5 leading-snug"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
