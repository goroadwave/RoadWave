'use client'

import { useRef, useState, useTransition } from 'react'
import { saveAvatarUrlAction } from '@/app/(app)/profile/setup/actions'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

type Props = {
  userId: string
  initialUrl: string | null
  displayInitial: string
}

export function AvatarUpload({ userId, initialUrl, displayInitial }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    if (uploading || pending) return
    fileInputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Pick an image file — PNG, JPG, WebP, or GIF.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That image is over 5 MB. Try a smaller one.')
      e.target.value = ''
      return
    }

    // Show local preview immediately for instant feedback.
    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setUploading(true)

    try {
      const supabase = createSupabaseBrowserClient()
      const ext =
        (file.name.split('.').pop() || file.type.split('/').pop() || 'jpg').toLowerCase()
      const path = `${userId}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        })
      if (uploadError) {
        setError(uploadError.message)
        setUploading(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)

      // Cache-bust so subsequent loads show the new image instead of the
      // CDN's cached old one (same path, new content on re-upload).
      const finalUrl = `${publicUrl}?v=${Date.now()}`

      startTransition(async () => {
        const result = await saveAvatarUrlAction(finalUrl)
        if (result.error) {
          setError(result.error)
        } else {
          setPreviewUrl(finalUrl)
        }
        setUploading(false)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
      setUploading(false)
    } finally {
      // Reset so picking the same file again retriggers onChange.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const busy = uploading || pending

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={openPicker}
        disabled={busy}
        aria-label="Upload profile photo"
        className="group relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-2 border-flame/40 bg-card grid place-items-center hover:border-flame transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar is a user-uploaded URL; <Image> remote-host config is more setup than this needs
          <img
            src={previewUrl}
            alt="Your profile photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-4xl font-extrabold text-flame">
            {displayInitial}
          </span>
        )}
        <span
          className={`absolute inset-0 grid place-items-center bg-night/70 text-3xl transition-opacity ${
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          aria-hidden
        >
          {busy ? (
            <span className="text-xs font-semibold text-cream uppercase tracking-wider">
              Uploading…
            </span>
          ) : (
            '📷'
          )}
        </span>
      </button>

      <p className="text-center text-sm text-cream/85 max-w-xs">
        <span aria-hidden>📷</span>{' '}
        <span className="font-serif italic text-flame">
          Add your photo
        </span>{' '}
        — let neighbors put a face to the wave!
      </p>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  )
}
