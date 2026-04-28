'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import {
  postBulletinAction,
  type BulletinState,
} from '@/app/owner/(authed)/bulletin/actions'

const initialState: BulletinState = { error: null, ok: false }

export function OwnerBulletinForm({ campgroundId }: { campgroundId: string }) {
  const [state, formAction, pending] = useActionState(
    postBulletinAction,
    initialState,
  )
  const [count, setCount] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset()
      setCount(0)
    }
  }, [state.ok])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-2xl border border-white/5 bg-card p-4"
    >
      <input type="hidden" name="campground_id" value={campgroundId} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-cream">Message</label>
          <span
            className={
              count > 280
                ? 'text-xs text-red-300'
                : 'text-xs text-mist'
            }
          >
            {count}/280
          </span>
        </div>
        <textarea
          name="message"
          required
          maxLength={280}
          rows={3}
          onChange={(e) => setCount(e.target.value.length)}
          className={`${inputCls} resize-y`}
          placeholder="Pool's open until 9 tonight — kids welcome with a parent."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            Category
          </label>
          <select name="category" defaultValue="general" className={inputCls}>
            <option value="event" className="bg-night">Event</option>
            <option value="special" className="bg-night">Special</option>
            <option value="alert" className="bg-night">Alert</option>
            <option value="general" className="bg-night">General</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-cream">
            Expires
          </label>
          <select name="duration" defaultValue="3days" className={inputCls}>
            <option value="today" className="bg-night">Today</option>
            <option value="3days" className="bg-night">3 days</option>
            <option value="1week" className="bg-night">1 week</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-md border border-leaf/30 bg-leaf/10 p-2 text-sm text-leaf">
          Bulletin posted.
        </p>
      )}

      <button type="submit" disabled={pending} className={primaryBtn}>
        {pending ? 'Posting…' : 'Post bulletin'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'

const primaryBtn =
  'rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 transition-colors'
