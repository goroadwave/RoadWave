'use client'

import { useEffect, useState } from 'react'
import { EmptyState } from './empty-state'

type RouteHealth = {
  route: string
  status: number | null
  ok: boolean
  error: string | null
  ms: number
}

type Response = {
  routes: RouteHealth[]
  vercel: { connected: boolean; reason: string }
  playwright: { connected: boolean; reason: string }
}

export function RouteHealthList() {
  const [data, setData] = useState<Response | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchOnce() {
      try {
        const res = await fetch('/api/admin/health', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        if (!res.ok) throw new Error(`Health probe failed (${res.status})`)
        const json = (await res.json()) as Response
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchOnce()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchOnce()
    }, 5 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  if (loading) {
    return (
      <p className="rounded-2xl border border-white/5 bg-card p-4 text-xs text-mist">
        Checking routes…
      </p>
    )
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
        {error}
      </p>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/5 bg-card p-4">
        <p className="text-[10px] uppercase tracking-wider text-mist mb-3">
          Public routes (anonymous probe)
        </p>
        <ul className="divide-y divide-white/5">
          {data.routes.map((r) => (
            <li
              key={r.route}
              className="flex items-center justify-between py-2 text-xs gap-3"
            >
              <span className="font-mono text-cream truncate">{r.route}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-mist tabular-nums">{r.ms}ms</span>
                <span
                  className={
                    r.ok
                      ? 'inline-flex items-center rounded-full border border-leaf/40 bg-leaf/10 px-2 py-0.5 text-[10px] font-semibold text-leaf'
                      : 'inline-flex items-center rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300'
                  }
                >
                  {r.status ?? r.error ?? 'error'}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <EmptyState
        title="Vercel deployment status"
        body={data.vercel.reason}
        notConnected
      />
      <EmptyState
        title="Playwright test history"
        body={data.playwright.reason}
        notConnected
      />
    </div>
  )
}
