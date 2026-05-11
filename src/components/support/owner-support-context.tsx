'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Owner Riley's chat panel state. Mirrors GuestSupportProvider but
// for the /owner/* dashboard. The Provider is mounted in the root
// layout so Riley's floating button (also at the root) can read it,
// and the panel (OwnerSupportChat, mounted in /owner/(authed)/
// layout) registers itself via useOwnerSupportRegister so Riley can
// tell whether to open the panel directly or fall back to a route
// navigation when the visitor is outside the authed dashboard.

type OwnerSupportCtx = {
  /** True iff an OwnerSupportChat panel is currently in the tree. */
  mounted: boolean
  setMounted: (mounted: boolean) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const defaultCtx: OwnerSupportCtx = {
  mounted: false,
  setMounted: () => {},
  open: false,
  setOpen: () => {},
}

const OwnerSupportContext = createContext<OwnerSupportCtx>(defaultCtx)

export function useOwnerSupport(): OwnerSupportCtx {
  return useContext(OwnerSupportContext)
}

export function useOwnerSupportRegister() {
  const { setMounted } = useContext(OwnerSupportContext)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [setMounted])
}

export function OwnerSupportProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMountedState] = useState(false)
  const [open, setOpen] = useState(false)
  const setMounted = useCallback((m: boolean) => setMountedState(m), [])
  return (
    <OwnerSupportContext.Provider value={{ mounted, setMounted, open, setOpen }}>
      {children}
    </OwnerSupportContext.Provider>
  )
}
