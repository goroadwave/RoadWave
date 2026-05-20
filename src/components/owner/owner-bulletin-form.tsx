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

      {/* Phase 3c -- critical weather / safety notice elevator. When
          checked, this bulletin renders as a prominent red banner at
          the very top of the camper QR page (above the welcome
          header) AND lights up the Lantern with a dedicated item
          type. Stays pinned until the bulletin expires or the owner
          un-checks. Most recent active critical wins if more than
          one exists. */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.05] p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_critical"
            value="true"
            className="mt-0.5 h-4 w-4 rounded border-red-400/60 bg-night text-red-400 focus:ring-red-400 focus:ring-offset-night"
          />
          <span className="space-y-1">
            <span className="block text-sm font-semibold text-red-200">
              Mark as Critical Weather / Safety Notice
            </span>
            <span className="block text-xs text-mist leading-snug">
              Pins this to the top of the camper QR page with a red
              banner. Use sparingly — for severe weather, evacuation,
              shelter-in-place, or other urgent safety information.
              For emergencies, campers should always call 911 first.
            </span>
          </span>
        </label>
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
