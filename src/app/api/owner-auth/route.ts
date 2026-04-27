import { createHash } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'

// The token is a SHA-256 hash of OWNER_PASSWORD + a fixed suffix. This way
// the raw password never sits in the client's localStorage, and rotating
// OWNER_PASSWORD invalidates every existing session.
const TOKEN_SUFFIX = 'roadwave-owner-session-v1'

function tokenFor(password: string): string {
  return createHash('sha256').update(password + TOKEN_SUFFIX).digest('hex')
}

export async function POST(request: NextRequest) {
  const ownerPassword = process.env.OWNER_PASSWORD
  if (!ownerPassword) {
    return new NextResponse('Owner access not configured', { status: 503 })
  }

  let payload: { password?: unknown; token?: unknown }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const expected = tokenFor(ownerPassword)

  // Token verification path.
  if (typeof payload.token === 'string' && payload.token.length > 0) {
    if (payload.token === expected) {
      return NextResponse.json({ ok: true, token: expected })
    }
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Password login path.
  if (typeof payload.password === 'string' && payload.password.length > 0) {
    if (payload.password === ownerPassword) {
      return NextResponse.json({ ok: true, token: expected })
    }
    return new NextResponse('Wrong password', { status: 401 })
  }

  return new NextResponse('Bad request', { status: 400 })
}
