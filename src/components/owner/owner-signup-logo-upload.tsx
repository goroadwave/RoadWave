'use client'

import { useRef, useState } from 'react'

type Props = {
  value: string | null
  onChange: (url: string | null) => void
}

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

// Pre-auth logo upload. Posts the file to /api/owner/signup-logo
// (which writes to the demo-logos bucket via service role) and gets
// back a public URL. The URL is held in parent form state via the
// onChange callback and submitted as a hidden field.
export function OwnerSignupLogoUpload({ value, onChange }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!ALLOWED.includes(file.type)) {
      setError('Pick a PNG, JPG, WebP, or GIF.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Logo must be under 2 MB.')
      e.target.value = ''
      return
    }
    setPending(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/owner/signup-logo', {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? `Upload failed (${res.status})`)
        return
      }
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setPending(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function clearLogo() {
    onChange(null)
    setError(null)
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- public URL preview, no remote-image config needed */}
          <img
            src={value}
            alt="Campground logo preview"
            className="h-16 w-16 rounded-xl object-cover border border-flame/30 bg-cream"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-mist truncate">Logo uploaded.</p>
            <button
              type="button"
              onClick={clearLogo}
              className="text-xs text-flame underline-offset-2 hover:underline"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="rounded-lg border border-flame/40 bg-flame/10 text-cream px-3 py-2 text-sm font-semibold hover:bg-flame/20 disabled:opacity-50"
          >
            {pending ? 'Uploading…' : 'Choose logo'}
          </button>
          <p className="text-[11px] text-mist leading-snug">
            PNG, JPG, WebP, or GIF · 2 MB max
          </p>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  )
}
