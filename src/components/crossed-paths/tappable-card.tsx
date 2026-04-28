'use client'

import { useRouter } from 'next/navigation'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
  className?: string
  ariaLabel?: string
}

// Whole-card tappable wrapper. Uses an explicit onClick that calls
// router.push() rather than wrapping the children in an <a> — some iOS
// Safari versions don't fire taps on <a> elements that wrap large
// flex/grid card layouts (the inner element can swallow the tap and
// nothing happens). This pattern is bulletproof: a div with role=button,
// tabIndex=0, onClick + onKeyDown for keyboard parity, and an explicit
// CSS rule that lights up the tap region on iOS.
export function TappableCard({ href, children, className, ariaLabel }: Props) {
  const router = useRouter()

  function go(e: MouseEvent | KeyboardEvent) {
    // If the user tapped a real <a>, <button>, or <input> inside the card,
    // let the browser handle it instead of routing.
    const target = e.target as HTMLElement
    if (target.closest('a, button, input, textarea, select, label')) return
    router.push(href)
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      go(e)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={go}
      onKeyDown={onKeyDown}
      className={`block w-full cursor-pointer ${className ?? ''}`}
      // iOS-friendly tap feedback. -webkit-tap-highlight-color must be in
      // style, not Tailwind.
      style={{ WebkitTapHighlightColor: 'rgba(245, 158, 11, 0.15)' }}
    >
      {children}
    </div>
  )
}
