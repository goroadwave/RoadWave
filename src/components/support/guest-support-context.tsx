'use client'

import { createContext, useContext, useState } from 'react'

// Small context that lets the guest support chat live outside the
// floating-button paradigm. The (app) layout wraps everything below
// the auth gates in <GuestSupportProvider enabled={hasActiveCheckIn}>.
// AppNav reads `enabled` to decide whether to render the "Help" tab,
// and reads `setOpen` to open the panel when the tab is tapped.
// SupportChat (the panel + state) consumes `open`/`setOpen` so the
// trigger and the panel can live in different parts of the tree.

type GuestSupportCtx = {
  /** True when the visitor has an active check-in and the chat is
   *  available. Drives whether AppNav shows the Help tab. */
  enabled: boolean
  /** Whether the chat panel is currently open. */
  open: boolean
  setOpen: (open: boolean) => void
}

const defaultCtx: GuestSupportCtx = {
  enabled: false,
  open: false,
  setOpen: () => {},
}

const GuestSupportContext = createContext<GuestSupportCtx>(defaultCtx)

/** Read the guest support state. Returns the default (disabled,
 *  closed) when called outside the provider — safe to use in shared
 *  components like AppNav that render on both owner and guest
 *  surfaces. */
export function useGuestSupport(): GuestSupportCtx {
  return useContext(GuestSupportContext)
}

export function GuestSupportProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <GuestSupportContext.Provider value={{ enabled, open, setOpen }}>
      {children}
    </GuestSupportContext.Provider>
  )
}
