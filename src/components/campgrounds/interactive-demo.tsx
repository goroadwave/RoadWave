'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { InteractiveDemoPreview } from '@/components/campgrounds/demo-preview'

// 3-step self-serve demo wizard for /campgrounds.
//   step 1: input — campground name (required) + optional logo / website /
//                   city / region.
//   step 2: preview — InteractiveDemoPreview with Guest+Owner toggle.
//   step 3: share — Email me this demo / Set this up for my campground.
//
// The wizard is fully client-side until the user explicitly saves: the
// demo only persists to /api/demo when they click an action button on
// step 3, so people can play with the preview without leaving any data
// behind.

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]

type Step = 'input' | 'preview' | 'share'

type DemoInput = {
  campgroundName: string
  logoFile: File | null
  logoPreviewUrl: string | null
  website: string
  city: string
  region: string
}

const initialInput: DemoInput = {
  campgroundName: '',
  logoFile: null,
  logoPreviewUrl: null,
  website: '',
  city: '',
  region: '',
}

export function InteractiveDemo() {
  const [step, setStep] = useState<Step>('input')
  const [input, setInput] = useState<DemoInput>(initialInput)

  // Saved-server-side state. Once the user clicks Email or Set this up, we
  // POST to /api/demo to create the persistent /demo/<slug> page, and
  // surface the slug here for "share" actions.
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  // Free the Object URL when the component unmounts or the logo changes so
  // we don't leak memory.
  useEffect(() => {
    return () => {
      if (input.logoPreviewUrl) URL.revokeObjectURL(input.logoPreviewUrl)
    }
  }, [input.logoPreviewUrl])

  function goToPreview() {
    if (input.campgroundName.trim().length === 0) return
    setStep('preview')
  }

  function backToInput() {
    setStep('input')
  }

  function goToShare() {
    setStep('share')
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 'input' && (
        <InputStep
          input={input}
          onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
          onContinue={goToPreview}
        />
      )}

      {step === 'preview' && (
        <PreviewStep
          input={input}
          onBack={backToInput}
          onContinue={goToShare}
        />
      )}

      {step === 'share' && (
        <ShareStep
          input={input}
          savedSlug={savedSlug}
          onSaved={(slug) => setSavedSlug(slug)}
          onBack={() => setStep('preview')}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stepper
// ---------------------------------------------------------------------------

function Stepper({ step }: { step: Step }) {
  const stepNum = step === 'input' ? 1 : step === 'preview' ? 2 : 3
  return (
    <ol
      className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.18em] text-mist"
      aria-label="Demo progress"
    >
      <Dot active={stepNum >= 1}>1 · Your info</Dot>
      <Sep />
      <Dot active={stepNum >= 2}>2 · Live preview</Dot>
      <Sep />
      <Dot active={stepNum >= 3}>3 · Share</Dot>
    </ol>
  )
}

function Dot({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <li
      className={
        active
          ? 'flex items-center gap-1.5 text-flame font-semibold'
          : 'flex items-center gap-1.5 text-mist'
      }
    >
      <span
        aria-hidden
        className={
          active
            ? 'h-1.5 w-1.5 rounded-full bg-flame'
            : 'h-1.5 w-1.5 rounded-full bg-white/15'
        }
      />
      <span>{children}</span>
    </li>
  )
}

function Sep() {
  return <li aria-hidden className="h-px w-4 bg-white/15" />
}

// ---------------------------------------------------------------------------
// Step 1 — Input
// ---------------------------------------------------------------------------

function InputStep({
  input,
  onChange,
  onContinue,
}: {
  input: DemoInput
  onChange: (patch: Partial<DemoInput>) => void
  onContinue: () => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const ready = input.campgroundName.trim().length > 0

  function pickLogo(file: File | null) {
    setLogoError(null)
    if (!file) return
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError('Use a PNG, JPG, WebP, or SVG.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Image must be under 2 MB.')
      return
    }
    if (input.logoPreviewUrl) URL.revokeObjectURL(input.logoPreviewUrl)
    const previewUrl = URL.createObjectURL(file)
    onChange({ logoFile: file, logoPreviewUrl: previewUrl })
  }

  function clearLogo() {
    if (input.logoPreviewUrl) URL.revokeObjectURL(input.logoPreviewUrl)
    onChange({ logoFile: null, logoPreviewUrl: null })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <form
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (ready) onContinue()
      }}
      className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40"
    >
      <Field label="Campground name" required>
        <input
          name="campground_name"
          required
          value={input.campgroundName}
          onChange={(e) => onChange({ campgroundName: e.target.value })}
          maxLength={120}
          placeholder="Oak Hollow RV Resort"
          className={inputCls}
        />
      </Field>

      <Field
        label="Logo"
        hint="Optional. PNG, JPG, WebP, or SVG. Up to 2 MB."
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-lg border border-white/15 bg-white/5 text-cream px-3 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            {input.logoFile ? 'Change logo' : 'Upload logo'}
          </button>
          {input.logoPreviewUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- in-memory Object URL */}
              <img
                src={input.logoPreviewUrl}
                alt="Logo preview"
                className="h-10 w-10 rounded-lg border border-white/10 bg-card object-cover"
              />
              <button
                type="button"
                onClick={clearLogo}
                className="text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
              >
                Remove
              </button>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          onChange={(e) => pickLogo(e.target.files?.[0] ?? null)}
        />
        {logoError && <p className="mt-1 text-xs text-red-300">{logoError}</p>}
      </Field>

      <Field label="Website" hint="Optional.">
        <input
          name="website"
          type="text"
          value={input.website}
          onChange={(e) => onChange({ website: e.target.value })}
          maxLength={300}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="www.yourcampground.com"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="City" hint="Optional.">
          <input
            name="city"
            value={input.city}
            onChange={(e) => onChange({ city: e.target.value })}
            maxLength={80}
            placeholder="Asheville"
            className={inputCls}
          />
        </Field>
        <Field label="State / region" hint="Optional.">
          <input
            name="region"
            value={input.region}
            onChange={(e) => onChange({ region: e.target.value })}
            maxLength={80}
            placeholder="NC"
            className={inputCls}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={!ready}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-4 py-3 font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        See your RoadWave page <span aria-hidden>→</span>
      </button>
      <p className="text-center text-[11px] text-mist/70">
        No sign-up. We don&apos;t store anything until you choose to.
      </p>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Preview
// ---------------------------------------------------------------------------

function PreviewStep({
  input,
  onBack,
  onContinue,
}: {
  input: DemoInput
  onBack: () => void
  onContinue: () => void
}) {
  return (
    <div className="space-y-4">
      <InteractiveDemoPreview
        campgroundName={input.campgroundName.trim()}
        logoUrl={input.logoPreviewUrl}
        city={input.city.trim() || null}
        region={input.region.trim() || null}
      />
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors"
        >
          Edit info
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
        >
          Continue <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Share & save
// ---------------------------------------------------------------------------

function ShareStep({
  input,
  savedSlug,
  onSaved,
  onBack,
}: {
  input: DemoInput
  savedSlug: string | null
  onSaved: (slug: string) => void
  onBack: () => void
}) {
  // After we save the demo to /api/demo, we surface the link + remember
  // the slug so subsequent actions don't double-create rows.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const sharedUrl = savedSlug ? `${origin}/demo/${savedSlug}` : null

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-flame">
          Share & save
        </p>
        <h2 className="mt-0.5 font-display text-xl font-extrabold text-cream">
          Looks good?
        </h2>
        <p className="text-xs text-mist">
          {sharedUrl
            ? 'Your shareable preview is live for the next 30 days.'
            : 'Pick one. Both keep RoadWave free for you to try.'}
        </p>
      </div>

      <EmailMeAction input={input} savedSlug={savedSlug} onSaved={onSaved} />

      <SetThisUpAction input={input} savedSlug={savedSlug} onSaved={onSaved} />

      {sharedUrl && (
        <div className="rounded-xl border border-flame/30 bg-flame/[0.06] p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-flame">
            Your preview link
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={sharedUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 rounded-md border border-white/10 bg-night text-cream px-2 py-1.5 text-xs font-mono"
            />
            <CopyButton value={sharedUrl} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-center w-full text-xs text-mist hover:text-cream underline-offset-2 hover:underline"
      >
        ← Back to preview
      </button>
    </div>
  )
}

function EmailMeAction({
  input,
  savedSlug,
  onSaved,
}: {
  input: DemoInput
  savedSlug: string | null
  onSaved: (slug: string) => void
}) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready) return
    setPending(true)
    setError(null)
    try {
      // Save the demo if we haven't already.
      let slug = savedSlug
      if (!slug) {
        slug = await createDemo({ ...input, email })
        onSaved(slug)
      }
      // Send the email.
      const res = await fetch('/api/demo/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email }),
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || 'Could not send the email.')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-leaf/40 bg-leaf/10 p-4 text-sm text-leaf">
        Sent. Check your inbox in a minute.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-night/60 p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-cream">Email me this demo</h3>
        <p className="text-xs text-mist">
          A link to your branded preview, sent from hello@getroadwave.com.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcampground.com"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
        />
        <button
          type="submit"
          disabled={!ready || pending}
          className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
        >
          {pending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  )
}

function SetThisUpAction({
  input,
  savedSlug,
  onSaved,
}: {
  input: DemoInput
  savedSlug: string | null
  onSaved: (slug: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!ready) return
    setPending(true)
    setError(null)
    try {
      // Save the demo if not already, so the lead has a preview URL on file.
      let slug = savedSlug
      if (!slug) {
        slug = await createDemo({ ...input, email })
        onSaved(slug)
      }
      // Lead capture into campground_leads.
      const res = await fetch('/api/campground-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          campground: input.campgroundName.trim(),
          email,
        }),
      })
      if (!res.ok && res.status >= 500) {
        // Soft-fail like the original lead form did.
        console.warn('lead submit returned', res.status)
      } else if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(body || 'Please check your fields.')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-flame/40 bg-flame/10 p-4 space-y-1 text-center">
        <p className="text-3xl" aria-hidden>
          🎉
        </p>
        <p className="font-display text-base font-extrabold text-cream">Thanks!</p>
        <p className="text-xs text-mist">
          We&apos;ll be in touch within a day or two.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-flame/30 bg-flame/[0.06] p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-cream">Set this up for my campground</h3>
        <p className="text-xs text-mist">
          Tell us who you are and we&apos;ll get your real campground onto
          RoadWave within a day or two.
        </p>
      </div>
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
      />
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourcampground.com"
        className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
      />
      <button
        type="submit"
        disabled={!ready || pending}
        className="w-full rounded-lg bg-flame text-night px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
      >
        {pending ? 'Submitting…' : 'Set this up for my campground'}
      </button>
      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1500)
        } catch {
          // No-op — input is selectable as a fallback.
        }
      }}
      className="rounded-md border border-flame/40 bg-flame/10 text-flame px-3 py-1.5 text-xs font-semibold hover:bg-flame/20 transition-colors shrink-0"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// /api/demo client helper
// ---------------------------------------------------------------------------

async function createDemo(input: {
  campgroundName: string
  logoFile: File | null
  website: string
  city: string
  region: string
  email: string
}): Promise<string> {
  const fd = new FormData()
  fd.set('campground_name', input.campgroundName.trim())
  if (input.logoFile) fd.set('logo', input.logoFile)
  if (input.website.trim()) fd.set('website', input.website.trim())
  if (input.city.trim()) fd.set('city', input.city.trim())
  if (input.region.trim()) fd.set('region', input.region.trim())
  if (input.email) fd.set('email', input.email)
  const res = await fetch('/api/demo', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(body || 'Could not save your demo. Try again.')
  }
  const json = (await res.json()) as { slug: string }
  return json.slug
}

// ---------------------------------------------------------------------------
// Shared field shell
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-cream">
        {label}
        {required && <span className="text-flame ml-1">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mist/80">{hint}</span>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame'
