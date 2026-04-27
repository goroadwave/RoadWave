import { type NextRequest, NextResponse } from 'next/server'

const VOICE_ID = 'OI50Z2uI2xyZtMdO2zZH'
const ELEVEN_URL = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`

export async function POST(request: NextRequest) {
  let payload: { text?: unknown }
  try {
    payload = await request.json()
  } catch {
    return new NextResponse('Invalid JSON', { status: 400 })
  }

  const text = typeof payload.text === 'string' ? payload.text.trim() : ''
  if (text.length === 0) {
    return new NextResponse('Missing text', { status: 400 })
  }
  if (text.length > 1000) {
    return new NextResponse('Text too long', { status: 400 })
  }

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return new NextResponse('TTS not configured', { status: 503 })
  }

  const upstream = await fetch(ELEVEN_URL, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2',
    }),
  })

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    return new NextResponse(`Upstream error: ${detail}`, {
      status: upstream.status,
    })
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
