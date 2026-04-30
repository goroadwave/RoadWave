import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/guard'

export const dynamic = 'force-dynamic'

const ROUTES = [
  '/',
  '/demo',
  '/signup',
  '/login',
  '/contact',
  '/privacy',
  '/terms',
  '/safety',
  '/community-rules',
  '/campground-partner-terms',
] as const

export type RouteHealth = {
  route: string
  status: number | null
  ok: boolean
  error: string | null
  ms: number
}

export type AdminHealthResponse = {
  routes: RouteHealth[]
  vercel: { connected: false; reason: string }
  playwright: { connected: false; reason: string }
}

export async function GET(request: Request) {
  // Server-side admin gate. Anonymous + non-admin → /login (redirect).
  await requireAdmin()

  const origin = new URL(request.url).origin
  const probes: RouteHealth[] = await Promise.all(
    ROUTES.map(async (route) => {
      const url = `${origin}${route}`
      const t0 = Date.now()
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'manual',
          // Don't propagate the admin's auth cookies to public route
          // probes — we want the anonymous response.
          headers: { 'cache-control': 'no-cache' },
          cache: 'no-store',
        })
        return {
          route,
          status: res.status,
          ok: res.status >= 200 && res.status < 400,
          error: null,
          ms: Date.now() - t0,
        }
      } catch (err) {
        return {
          route,
          status: null,
          ok: false,
          error: err instanceof Error ? err.message : 'unknown error',
          ms: Date.now() - t0,
        }
      }
    }),
  )

  const body: AdminHealthResponse = {
    routes: probes,
    vercel: {
      connected: false,
      reason: 'VERCEL_TOKEN not configured. Add it to read deployment status.',
    },
    playwright: {
      connected: false,
      reason: 'No Playwright result store wired up yet.',
    },
  }
  return NextResponse.json(body, {
    headers: { 'cache-control': 'no-store' },
  })
}
