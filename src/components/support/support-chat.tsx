'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

// Shared support-chat widget used by GuestSupportChat (amber, on (app)
// pages with active check-in) and OwnerSupportChat (forest green, on
// /owner/* pages). Two thin wrappers configure the audience-specific
// theme + labels and forward to this single component.
//
// All API calls go through /api/support-chat (Anthropic relay) and
// /api/support-chat/report (email forwarding) — the Anthropic key
// never reaches this client.

type Message = { role: 'user' | 'assistant'; content: string }

type Theme = {
  /** Floating-button background. */
  buttonBg: string
  /** CSS box-shadow on the floating button — usually a glow in buttonBg. */
  buttonShadow: string
  /** Tinted header background behind the panel title. */
  panelHeaderBg: string
  /** Background for the "Report …" CTA shown after 3 unresolved exchanges. */
  reportButtonBg: string
}

type Props = {
  audience: 'guest' | 'owner'
  /** Title shown in the panel header (e.g. "Ask RoadWave 👋"). */
  headerLabel: string
  /** Floating-button glyph (emoji is fine — runs in modern browsers). */
  triggerIcon: string
  triggerAriaLabel: string
  theme: Theme
  reportButtonLabel: string
  /** Empty-state placeholder shown above the input when chat is fresh. */
  greeting: string
  /** Owner: `true` so the current pathname is forwarded to the API for
   *  page-aware context. Guest: omit. */
  includePathname?: boolean
  /** When true, the default floating trigger button is NOT rendered.
   *  Used by the guest variant, where the trigger lives in AppNav. */
  hideDefaultTrigger?: boolean
  /** Optional external open-state. When provided, this overrides the
   *  internal open/setOpen — letting a parent component (e.g. a nav
   *  tab) drive when the panel opens and closes. */
  externalOpen?: boolean
  setExternalOpen?: (open: boolean) => void
}

const MAX_USER_MESSAGES_PER_SESSION = 20
const REPORT_AFTER_EXCHANGES = 3

export function SupportChat(props: Props) {
  const pathname = usePathname()
  // open / setOpen come from props when an external controller is
  // provided (guest variant routes through GuestSupportContext so the
  // AppNav "Help" tab can open the panel); otherwise the component
  // owns its own open state and the floating trigger toggles it.
  const useExternal =
    typeof props.externalOpen === 'boolean' &&
    typeof props.setExternalOpen === 'function'
  const [internalOpen, setInternalOpen] = useState(false)
  const open = useExternal ? props.externalOpen! : internalOpen
  const setOpen = useExternal ? props.setExternalOpen! : setInternalOpen
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll messages list to bottom whenever it changes or the
  // panel opens. Also focus the input when opening.
  useEffect(() => {
    if (!open) return
    const sc = scrollRef.current
    if (sc) sc.scrollTop = sc.scrollHeight
    const t = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => window.clearTimeout(t)
  }, [open, messages, busy])

  // Lock body scroll while the panel is open — prevents background
  // jitter when the on-screen keyboard pushes layout on mobile.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape key closes the panel.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const userMsgCount = messages.filter((m) => m.role === 'user').length
  const assistantMsgCount = messages.filter((m) => m.role === 'assistant').length
  const completedExchanges = Math.min(userMsgCount, assistantMsgCount)
  const showReportButton =
    completedExchanges >= REPORT_AFTER_EXCHANGES && !reportSent
  const atLimit = userMsgCount >= MAX_USER_MESSAGES_PER_SESSION

  async function send() {
    const trimmed = input.trim()
    if (!trimmed || busy || atLimit) return

    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(newMessages)
    setInput('')
    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: props.audience,
          messages: newMessages,
          pathname: props.includePathname ? pathname : undefined,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { content: string }
      setMessages([
        ...newMessages,
        { role: 'assistant', content: json.content },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setBusy(false)
    }
  }

  async function sendReport() {
    if (reporting) return
    setReporting(true)
    setError(null)
    try {
      const res = await fetch('/api/support-chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: props.audience,
          messages,
          pathname: props.includePathname ? pathname : undefined,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error ?? `HTTP ${res.status}`)
      }
      setReportSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send report.')
    } finally {
      setReporting(false)
    }
  }

  return (
    <>
      {/* ---- Floating trigger ---- */}
      {/* Owner variant uses the default floating button. Guest variant
          passes hideDefaultTrigger so the trigger can live in AppNav
          and the bottom-right corner stays free for the Riley
          mascot. */}
      {!open && !props.hideDefaultTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={props.triggerAriaLabel}
          className="fixed bottom-4 right-4 z-50 grid h-14 w-14 place-items-center rounded-full text-2xl transition-transform hover:scale-105 active:scale-95"
          style={{
            backgroundColor: props.theme.buttonBg,
            boxShadow: props.theme.buttonShadow,
          }}
        >
          <span aria-hidden>{props.triggerIcon}</span>
        </button>
      )}

      {/* ---- Chat panel ---- */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={props.headerLabel}
          className="fixed z-50 flex flex-col bg-card text-cream border border-white/10 shadow-2xl shadow-black/60"
          style={{
            // Mobile: 90vw × 85vh, vertically centered.
            // Desktop: pinned to bottom-right with comfortable max width.
            width: 'min(380px, 90vw)',
            height: 'min(620px, 85vh)',
            bottom: '16px',
            right: 'max(16px, calc(50vw - 190px))',
            borderRadius: '20px',
          }}
        >
          {/* Header */}
          <header
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10"
            style={{
              backgroundColor: props.theme.panelHeaderBg,
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
            }}
          >
            <h2 className="font-semibold text-cream text-sm">
              {props.headerLabel}
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-cream hover:bg-white/20 transition-colors"
            >
              <span aria-hidden className="text-base leading-none">
                ✕
              </span>
            </button>
          </header>

          {/* Messages list */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5"
          >
            {messages.length === 0 && (
              <p className="text-sm text-mist text-center px-3 py-6 leading-relaxed">
                {props.greeting}
              </p>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {busy && <TypingIndicator />}
            {error && (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}
          </div>

          {/* Report button — appears after 3 completed exchanges */}
          {showReportButton && (
            <div className="px-3 pb-2">
              <button
                type="button"
                onClick={sendReport}
                disabled={reporting}
                className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: props.theme.reportButtonBg }}
              >
                {reporting ? 'Sending…' : props.reportButtonLabel}
              </button>
            </div>
          )}
          {reportSent && (
            <div className="px-3 pb-2">
              <p className="rounded-md border border-flame/30 bg-flame/[0.06] px-3 py-2 text-xs text-cream/90 text-center">
                Sent to the RoadWave team. We&rsquo;ll reply by email.
              </p>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
            className="border-t border-white/10 px-3 py-2 flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              disabled={busy || atLimit}
              placeholder={
                atLimit
                  ? 'Session limit reached. Refresh to start a new chat.'
                  : 'Type your message…'
              }
              rows={1}
              maxLength={2000}
              className="flex-1 resize-none rounded-lg bg-white/5 border border-white/10 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim() || atLimit}
              className="rounded-lg bg-flame text-night px-3 py-2 text-sm font-semibold shadow-sm hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? '…' : 'Send'}
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'rounded-2xl rounded-tr-sm bg-flame text-night px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap'
            : 'rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-cream px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap'
        }
      >
        {content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 px-3 py-2 text-sm flex items-center gap-1">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-mist animate-pulse"
          style={{ animationDelay: '0s' }}
          aria-hidden
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-mist animate-pulse"
          style={{ animationDelay: '0.15s' }}
          aria-hidden
        />
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-mist animate-pulse"
          style={{ animationDelay: '0.3s' }}
          aria-hidden
        />
        <span className="sr-only">Assistant is typing</span>
      </div>
    </div>
  )
}
