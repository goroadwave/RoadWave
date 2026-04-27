const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

// Accept either a raw UUID or a URL with ?token=<uuid> in it.
export function extractToken(scanned: string): string | null {
  if (isUuid(scanned)) return scanned
  try {
    const url = new URL(scanned)
    const token = url.searchParams.get('token')
    if (token && isUuid(token)) return token
  } catch {
    // Not a URL.
  }
  return null
}
