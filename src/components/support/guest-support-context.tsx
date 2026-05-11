'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Small context that lets the guest support chat (Riley's chat panel)
// be controlled by a trigger living anywhere in the tree. The Provider
// is mounted in the root layout so the trigger (FloatingTourButton)
// and the panel (GuestSupportChat, mounted inside the (app) layout)
// share the same open/close state.
//
// `mounted` tracks whether the chat panel is actually present in the
// tree — the panel calls useGuestSupportRegister() to flip it true on
// mount, false on unmount. Riley's button uses this to decide between
// opening the panel (mounted=true → setOpen(true)) and falling back
// to a route navigation (mounted=false → router.push('/home')) when
// the visitor is on a marketing surface where the panel isn't loaded.

type GuestSupportCtx = {
  /** True iff a GuestSupportChat panel is currently in the React tree. */
  mounted: boolean
  /** Used internally by GuestSupportChat to register/unregister. */
  setMounted: (mounted: boolean) => void
  /** Whether the chat panel is currently open. */
  open: boolean
  setOpen: (open: boolean) => void
}

const defaultCtx: GuestSupportCtx = {
  mounted: false,
  setMounted: () => {},
  open: false,
  setOpen: () => {},
}

const GuestSupportContext = createContext<GuestSupportCtx>(defaultCtx)

/** Read the guest support state. Returns the default (unmounted,
 *  closed) when called outside the provider. */
export function useGuestSupport(): GuestSupportCtx {
  return useContext(GuestSupportContext)
}

/** Used by GuestSupportChat to declare its presence to the Provider
 *  so consumers (Riley's button) can tell whether the panel is
 *  available to be opened or whether a route fallback is required. */
export function useGuestSupportRegister() {
  const { setMounted } = useContext(GuestSupportContext)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [setMounted])
}

export function GuestSupportProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMountedState] = useState(false)
  const [open, setOpen] = useState(false)
  // Stable identity so the panel's useEffect doesn't refire on every
  // provider re-render.
  const setMounted = useCallback((m: boolean) => setMountedState(m), [])
  return (
    <GuestSupportContext.Provider value={{ mounted, setMounted, open, setOpen }}>
      {children}
    </GuestSupportContext.Provider>
  )
}
