'use client'

import { useState, type ChangeEvent } from 'react'
import {
  uploadCampgroundLogoAction,
  clearLogoAction,
} from '@/app/owner/(authed)/profile/logo-actions'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

type Props = {
  campgroundId: string
  currentLogoUrl: string | null
}

export function OwnerLogoUpload({ campgroundId, currentLogoUrl }: Props) {
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setInfo(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('PNG, JPG, WebP, or SVG only.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Logo must be 2 MB or smaller.')
      return
    }

    setBusy(true)
    try {
      // Upload goes through a server action that authenticates the
      // caller, verifies campground ownership, and writes to Storage
      // via the service-role client. The previous direct-browser-to-
      // Storage path depended on storage.objects RLS, which was failing
      // in production for the owner role context. Server-action upload
      // is also more robust against future auth changes because the
      // ownership check is enforced explicitly in our code instead of
      // implicitly via the storage RLS evaluator.
      const formData = new FormData()
      formData.set('file', file)
      const result = await uploadCampgroundLogoAction(campgroundId, formData)
      if (!result.ok || !result.url) {
        throw new Error(result.error ?? 'Upload failed.')
      }
      setLogoUrl(result.url)
      setInfo('Logo updated.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function clearLogo() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await clearLogoAction(campgroundId)
      if (!res.ok) throw new Error(res.error ?? 'Could not clear logo.')
      setLogoUrl(null)
      setInfo('Logo cleared.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not clear logo.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-cream">Logo</p>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- direct <img> for owner-uploaded asset
          <img
            src={logoUrl}
            alt="Campground logo"
            className="h-16 w-16 rounded-xl border border-white/10 bg-card object-cover shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-xl border border-dashed border-white/15 bg-card grid place-items-center text-2xl shrink-0">
            🏕️
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label
            className={
              busy
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame/40 text-night/60 px-3 py-1.5 text-xs font-semibold cursor-not-allowed'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors cursor-pointer'
            }
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFile}
              disabled={busy}
              className="sr-only"
            />
            {busy ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
          </label>
          {logoUrl && !busy && (
            <button
              type="button"
              onClick={clearLogo}
              className="text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline self-start"
            >
              Remove logo
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-mist">
        PNG, JPG, WebP, or SVG · max 2 MB · square works best.
      </p>
      {error && (
        <p className="text-xs text-red-300">{error}</p>
      )}
      {info && !error && (
        <p className="text-xs text-leaf">{info}</p>
      )}
    </div>
  )
}
