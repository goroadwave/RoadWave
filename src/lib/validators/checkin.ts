const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

// Pull a check-in token out of whatever the scanner produced. Accepted shapes:
//   1. A bare UUID                        -> "123e4567-…"
//   2. A URL with ?token=<uuid>           -> "https://…/checkin?token=<uuid>"
//   3. A URL whose path contains a UUID   -> "https://…/checkin/<uuid>"
//                                            "https://…/c/<uuid>"
//                                            "https://…/<uuid>"
// Anything else returns null. Strict UUID validation guards against arbitrary
// path strings being treated as tokens.
export function extractToken(scanned: string): string | null {
  const trimmed = scanned.trim()
  if (isUuid(trimmed)) return trimmed

  try {
    const url = new URL(trimmed)

    // Query param wins if present.
    const queryToken = url.searchParams.get('token')
    if (queryToken && isUuid(queryToken)) return queryToken

    // Otherwise scan the path segments for a UUID, last-first since the
    // typical shape is /checkin/<uuid> or /<uuid>.
    const segments = url.pathname.split('/').filter(Boolean)
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i]
      if (isUuid(seg)) return seg
    }
  } catch {
    // Not a URL — fall through.
  }
  return null
}
