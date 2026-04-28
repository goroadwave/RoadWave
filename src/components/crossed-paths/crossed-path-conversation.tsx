'use client'

import { format } from 'date-fns'
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { sendCrossedPathMessageAction } from '@/app/(app)/crossed-paths/actions'

type Message = {
  id: string
  sender_id: string
  body: string
  created_at: string
}

type DayGroup = { dayLabel: string; messages: Message[] }

type Props = {
  crossedPathId: string
  currentUserId: string
  groups: DayGroup[]
}

export function CrossedPathConversation({
  crossedPathId,
  currentUserId,
  groups,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message after server data updates.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [groups])

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) return
    setError(null)

    const formData = new FormData()
    formData.append('crossed_path_id', crossedPathId)
    formData.append('body', trimmed)

    startTransition(async () => {
      const result = await sendCrossedPathMessageAction(
        { ok: false, error: null },
        formData,
      )
      if (!result.ok) {
        setError(result.error ?? 'Could not send.')
        return
      }
      setDraft('')
      // Refresh server data so the new message appears.
      router.refresh()
    })
  }

  const flat = groups.flatMap((g) => g.messages)
  const isEmpty = flat.length === 0

  return (
    <div className="rounded-2xl border border-white/5 bg-card overflow-hidden flex flex-col">
      {/* Message stream */}
      <div
        ref={scrollRef}
        className="px-3 py-4 space-y-4 max-h-[60vh] min-h-[300px] overflow-y-auto"
      >
        {isEmpty ? (
          <div className="text-center text-sm text-mist italic py-10">
            Say hi. They&apos;ll see your message next time they open RoadWave.
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.dayLabel} className="space-y-1.5">
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-mist/70 my-2">
                {group.dayLabel}
              </p>
              {group.messages.map((m, i) => {
                const mine = m.sender_id === currentUserId
                const prev = i > 0 ? group.messages[i - 1] : null
                const tightToPrev = !!prev && prev.sender_id === m.sender_id
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[80%] flex flex-col gap-0.5">
                      <div
                        className={
                          mine
                            ? 'rounded-2xl rounded-br-sm bg-flame text-night px-3 py-2 text-sm font-medium shadow-md shadow-flame/20'
                            : 'rounded-2xl rounded-bl-sm bg-white/10 text-cream px-3 py-2 text-sm'
                        }
                      >
                        {m.body}
                      </div>
                      {!tightToPrev && (
                        <p
                          className={`text-[10px] text-mist ${mine ? 'text-right' : 'text-left'} px-1`}
                        >
                          {format(new Date(m.created_at), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </section>
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 bg-card/60 px-3 py-3 space-y-2"
      >
        <div className="flex items-end gap-2">
          <textarea
            name="body"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter for newline.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            disabled={pending}
            maxLength={2000}
            placeholder="Type a message…"
            className="flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || draft.trim().length === 0}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-flame text-night font-bold shadow-md shadow-flame/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send"
          >
            {pending ? (
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 rounded-full border-2 border-night/30 border-t-night animate-spin"
              />
            ) : (
              <span aria-hidden>→</span>
            )}
          </button>
        </div>
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
            {error}
          </p>
        )}
        <p className="text-[10px] text-mist/70 text-center">
          Private — only you and your crossed-path can see this.
        </p>
      </form>
    </div>
  )
}
