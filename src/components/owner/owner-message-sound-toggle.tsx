'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Local-only "Play sound for new guest messages" toggle. Stored in
// the browser's localStorage under the same key the OwnerMessageToaster
// reads on each fire. Off by default. Resets if the owner clears
// their browser storage -- acceptable for a non-essential UX
// preference.
//
// Uses useSyncExternalStore so the toggle reads localStorage in a
// way that doesn't trip the react-hooks/set-state-in-effect lint
// rule and so SSR renders a stable "off" while the client lights up
// with the real persisted value after hydration.
//
// The toggle is rendered at the top of /owner/messages so it's
// discoverable when the owner is actively triaging the inbox.

const SOUND_PREF_KEY = 'roadwave:owner:msg:sound'

function readPref(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_PREF_KEY) === '1'
  } catch {
    return false
  }
}

// useSyncExternalStore expects (subscribe, getSnapshot, getServerSnapshot).
// We watch the cross-tab "storage" event so a flip in another tab
// reflects here. The snapshot is just the boolean.
function subscribe(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function OwnerMessageSoundToggle() {
  const enabled = useSyncExternalStore(
    subscribe,
    readPref,
    () => false, // SSR default: off.
  )

  const flip = useCallback(() => {
    if (typeof window === 'undefined') return
    try {
      if (enabled) window.localStorage.removeItem(SOUND_PREF_KEY)
      else window.localStorage.setItem(SOUND_PREF_KEY, '1')
    } catch {
      // localStorage unavailable (private browsing, quota). The
      // visual toast still works; sound just won't persist.
    }
    // Fire a storage event in this tab so useSyncExternalStore picks
    // up the change (storage event only fires in OTHER tabs by
    // default).
    window.dispatchEvent(new StorageEvent('storage', { key: SOUND_PREF_KEY }))
  }, [enabled])

  return (
    <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 cursor-pointer text-xs text-cream hover:bg-white/[0.06] transition-colors">
      <input
        type="checkbox"
        checked={enabled}
        onChange={flip}
        className="h-3.5 w-3.5 accent-flame"
      />
      <span>
        <span aria-hidden className="mr-1">
          🔔
        </span>
        Play sound for new guest messages
      </span>
    </label>
  )
}
