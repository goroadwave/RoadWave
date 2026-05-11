'use client'

import { createContext, useContext, useState } from 'react'

// Small context that lets the guest support chat (Riley's chat panel)
// live in the (app) layout while its trigger (the floating Riley
// button) lives in the root layout. The (app) layout wraps everything
// in <GuestSupportProvider>; Riley reads `mounted` to know whether
// to surface the "Chat with Riley" bubble, and calls `setOpen` to
// open the panel. The SupportChat panel itself consumes
// `open`/`setOpen` so trigger and panel can sit in different parts of
// the tree.

type GuestSupportCtx = {
  /** True when the real provider is up the tree (i.e. we're inside
   *  the (app) layout where the chat is available). Drives whether
   *  Riley's floating button surfaces the "Chat with Riley" bubble. */
  mounted: boolean
  /** Whether the chat panel is currently open. */
  open: boolean
  setOpen: (open: boolean) => void
}

const defaultCtx: GuestSupportCtx = {
  mounted: false,
  open: false,
  setOpen: () => {},
}

const GuestSupportContext = createContext<GuestSupportCtx>(defaultCtx)

/** Read the guest support state. Returns the default (unmounted,
 *  closed) when called outside the provider — safe to use in shared
 *  components that render on both (app) and non-(app) surfaces. */
export function useGuestSupport(): GuestSupportCtx {
  return useContext(GuestSupportContext)
}

export function GuestSupportProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <GuestSupportContext.Provider value={{ mounted: true, open, setOpen }}>
      {children}
    </GuestSupportContext.Provider>
  )
}
