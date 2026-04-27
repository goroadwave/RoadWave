'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const VISIT_KEY = 'hasVisitedBefore'

// On first visit (no localStorage flag), kicks the user over to /tour.
// On every subsequent visit, no-ops. Renders nothing.
export function FirstVisitRedirect() {
  const router = useRouter()

  useEffect(() => {
    const visited = localStorage.getItem(VISIT_KEY)
    if (visited === 'true') return
    // Set the flag immediately so a refresh mid-redirect doesn't loop.
    localStorage.setItem(VISIT_KEY, 'true')
    router.replace('/tour')
  }, [router])

  return null
}
