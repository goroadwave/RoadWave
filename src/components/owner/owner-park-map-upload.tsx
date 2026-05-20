'use client'

import { useState, type ChangeEvent } from 'react'
import {
  uploadParkMapAction,
  clearParkMapAction,
} from '@/app/owner/(authed)/profile/park-map-actions'

// Owner-facing Park Map upload widget. Mirrors the shape of
// owner-logo-upload.tsx (preview tile + upload/replace button +
// optional remove link + inline status text) but accepts PDF in
// addition to image MIMEs and renders a PDF badge in place of an
// image preview when the uploaded file is a PDF.
//
// Server action enforces the same constraints we validate here, so
// a hand-crafted form post can't bypass the limits.

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
]
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

type Props = {
  campgroundId: string
  currentUrl: string | null
  currentMime: string | null
  currentFileName: string | null
}

export function OwnerParkMapUpload({
  campgroundId,
  currentUrl,
  currentMime,
  currentFileName,
}: Props) {
  const [mapUrl, setMapUrl] = useState<string | null>(currentUrl)
  const [mapMime, setMapMime] = useState<string | null>(currentMime)
  const [mapFileName, setMapFileName] = useState<string | null>(
    currentFileName,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const isPdf = mapMime === 'application/pdf'
  const isImage =
    mapMime === 'image/png' ||
    mapMime === 'image/jpeg' ||
    mapMime === 'image/webp'

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so the SAME file can be re-selected after an
    // error -- otherwise the browser remembers the prior selection
    // and the change event won't fire again.
    e.target.value = ''
    if (!file) return

    setError(null)
    setInfo(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('PNG, JPG, WebP, or PDF only.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Map must be 10 MB or smaller.')
      return
    }

    setBusy(true)
    try {
      const formData = new FormData()
      formData.set('file', file)
      const result = await uploadParkMapAction(campgroundId, formData)
      if (!result.ok || !result.url) {
        throw new Error(result.error ?? 'Upload failed.')
      }
      setMapUrl(result.url)
      setMapMime(result.mime)
      setMapFileName(result.fileName)
      setInfo('Map uploaded.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function clearMap() {
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      const res = await clearParkMapAction(campgroundId)
      if (!res.ok) throw new Error(res.error ?? 'Could not remove map.')
      setMapUrl(null)
      setMapMime(null)
      setMapFileName(null)
      setInfo('Map removed.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove map.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-cream">Uploaded map file</p>
      <div className="flex items-center gap-3">
        {/* Preview tile. Images render inline; PDFs render as a
            labelled badge so the owner can confirm something is
            uploaded without having to open it. Empty state is a
            dashed map placeholder. */}
        {isImage && mapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded asset
          <img
            src={mapUrl}
            alt="Uploaded park map preview"
            className="h-20 w-28 rounded-xl border border-white/10 bg-card object-cover shrink-0"
          />
        ) : isPdf && mapUrl ? (
          <div className="h-20 w-28 rounded-xl border border-white/10 bg-card grid place-items-center shrink-0 px-2">
            <div className="text-center space-y-0.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-flame font-semibold">
                PDF
              </p>
              <p className="text-[11px] text-mist leading-tight">
                Uploaded
              </p>
            </div>
          </div>
        ) : (
          <div className="h-20 w-28 rounded-xl border border-dashed border-white/15 bg-card grid place-items-center shrink-0">
            <span className="text-2xl" aria-hidden>
              🗺️
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5 min-w-0">
          <label
            className={
              busy
                ? 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame/40 text-night/60 px-3 py-1.5 text-xs font-semibold cursor-not-allowed'
                : 'inline-flex items-center justify-center gap-2 rounded-lg bg-flame text-night px-3 py-1.5 text-xs font-semibold shadow-md shadow-flame/15 hover:bg-amber-400 transition-colors cursor-pointer'
            }
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFile}
              disabled={busy}
              className="sr-only"
            />
            {busy
              ? 'Uploading…'
              : mapUrl
                ? 'Replace map'
                : 'Upload park map'}
          </label>

          {mapUrl && !busy && (
            <div className="flex flex-col gap-1">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-leaf hover:text-cream underline-offset-2 hover:underline self-start"
              >
                Open in new tab ↗
              </a>
              <button
                type="button"
                onClick={clearMap}
                className="text-[11px] text-mist hover:text-cream underline-offset-2 hover:underline self-start"
              >
                Remove map
              </button>
            </div>
          )}

          {mapFileName && (
            <p
              className="text-[11px] text-mist truncate max-w-[14rem]"
              title={mapFileName}
            >
              {mapFileName}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-mist">
        PNG, JPG, WebP, or PDF · max 10 MB.
      </p>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {info && !error && <p className="text-xs text-leaf">{info}</p>}
    </div>
  )
}
