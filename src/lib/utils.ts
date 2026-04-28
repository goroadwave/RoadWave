import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getRequestIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers.get('x-real-ip')?.trim() || null
}

// Resolve the site's public origin for building absolute URLs (e.g. the
// emailRedirectTo passed to supabase.auth.signUp).
//
// Priority:
//   1. NEXT_PUBLIC_SITE_URL env var (set this in Vercel — guaranteed correct)
//   2. x-forwarded-proto + x-forwarded-host (set by Vercel + most proxies)
//   3. host header
//   4. http://localhost:3000 fallback
//
// The bug we fixed: previously this used the `Origin` request header (which
// is missing on same-origin server actions) and fell back to `http://${host}`,
// which sent users to http:// URLs that Supabase's allow-list rejected.
export function getSiteOrigin(headers: Headers): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL
  if (env) return env.replace(/\/$/, '')

  const proto =
    headers.get('x-forwarded-proto') ??
    (headers.get('host')?.startsWith('localhost') ? 'http' : 'https')
  const host =
    headers.get('x-forwarded-host') ??
    headers.get('host') ??
    'localhost:3000'
  return `${proto}://${host}`
}
