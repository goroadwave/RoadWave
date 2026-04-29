'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { submitReportAction, type ReportState } from '@/app/(app)/report/actions'

type Category = 'low' | 'medium' | 'high'

type Step = 'pick' | 'high-warning' | 'describe' | 'sent'

type Props = {
  /** The user being reported (optional — null for free-form reports). */
  reportedUserId?: string | null
  /** Display label for the reported subject (e.g. "@rolling_pines"). */
  reportedLabel?: string | null
  /** Optional campground context (current check-in). */
  campgroundId?: string | null
  /** Trigger element. Wrap a button or icon. */
  children: React.ReactNode
}

const TIERS: {
  key: Category
  label: string
  examples: string
  cardClass: string
}[] = [
  {
    key: 'low',
    label: 'Low',
    examples:
      'Spam, annoying messages, fake profile suspicion.',
    cardClass: 'border-white/10 hover:border-flame/40',
  },
  {
    key: 'medium',
    label: 'Medium',
    examples:
      'Harassment, repeated unwanted contact, aggressive behavior, impersonation.',
    cardClass: 'border-flame/30 hover:border-flame/60',
  },
  {
    key: 'high',
    label: 'High',
    examples:
      'Threats, stalking, sexual misconduct, underage user, predatory behavior, violence, or emergency danger.',
    cardClass: 'border-red-500/40 hover:border-red-400',
  },
]

export function ReportDialog({
  reportedUserId = null,
  reportedLabel = null,
  campgroundId = null,
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('pick')
  const [category, setCategory] = useState<Category | null>(null)
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Reset everything when the modal closes.
  useEffect(() => {
    if (!open) {
      setStep('pick')
      setCategory(null)
      setDescription('')
      setError(null)
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function pickCategory(c: Category) {
    setCategory(c)
    // High severity gets the 911 callout before the description form.
    setStep(c === 'high' ? 'high-warning' : 'describe')
  }

  function handleSubmit() {
    if (!category) return
    setError(null)
    const fd = new FormData()
    fd.set('category', category)
    fd.set('description', description.trim())
    if (reportedUserId) fd.set('reported_user_id', reportedUserId)
    if (campgroundId) fd.set('campground_id', campgroundId)

    startTransition(async () => {
      const result: ReportState = await submitReportAction(
        { ok: false, error: null },
        fd,
      )
      if (result.ok) {
        setStep('sent')
      } else {
        setError(result.error ?? "Couldn't submit. Try again.")
      }
    })
  }

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block">
        {children}
      </span>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-night/90 backdrop-blur px-4"
          onClick={() => setOpen(false)}
        >
          <div
            ref={dialogRef}
            className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-card p-6 shadow-2xl shadow-black/60 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-md text-mist hover:text-cream hover:bg-white/5"
            >
              ✕
            </button>

            {step === 'pick' && (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
                    Report
                  </p>
                  <h2 id="report-title" className="font-display text-xl font-extrabold text-cream mt-0.5">
                    What&apos;s going on
                    {reportedLabel ? <> with <span className="text-flame">{reportedLabel}</span></> : ''}?
                  </h2>
                  <p className="text-sm text-mist mt-1">
                    Pick the category that fits best. We review reports as part
                    of our trust and safety process.
                  </p>
                </div>
                <div className="grid gap-2">
                  {TIERS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => pickCategory(t.key)}
                      className={`text-left rounded-xl border ${t.cardClass} bg-white/5 hover:bg-white/10 px-4 py-3 transition-colors`}
                    >
                      <p className="font-semibold text-cream">{t.label}</p>
                      <p className="text-xs text-mist mt-1 leading-snug">{t.examples}</p>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 'high-warning' && (
              <>
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-100">
                  <p className="font-semibold text-red-200 mb-1">
                    If you are in immediate danger
                  </p>
                  <p className="text-sm leading-relaxed">
                    Call <strong>911</strong> and notify campground staff.
                    RoadWave is not an emergency service.
                  </p>
                </div>
                <p className="text-sm text-mist leading-relaxed">
                  We&apos;ll log a high-severity report and the reported account
                  will be suspended pending review.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                  >
                    I&apos;m calling 911
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('describe')}
                    className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 transition-colors"
                  >
                    Continue with report
                  </button>
                </div>
              </>
            )}

            {step === 'describe' && (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
                    Report · {category}
                  </p>
                  <h2 className="font-display text-xl font-extrabold text-cream mt-0.5">
                    Tell us what happened
                  </h2>
                </div>
                <textarea
                  rows={6}
                  maxLength={4000}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the behavior, when it happened, and anything else that helps us review this."
                  className="w-full rounded-lg border border-white/10 bg-white/5 text-cream placeholder:text-mist/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-flame focus:border-flame"
                />
                {error && (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">
                    {error}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep('pick')}
                    className="rounded-lg border border-white/15 bg-white/5 text-cream px-4 py-2 text-sm font-semibold hover:bg-white/10 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={pending || description.trim().length === 0}
                    onClick={handleSubmit}
                    className="rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
                  >
                    {pending ? 'Sending…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}

            {step === 'sent' && (
              <>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-flame">
                    Sent
                  </p>
                  <h2 className="font-display text-xl font-extrabold text-cream mt-0.5">
                    Thanks — we&apos;ve got it.
                  </h2>
                </div>
                <p className="text-sm text-mist leading-relaxed">
                  We&apos;ve logged your report. Reports are reviewed as part of
                  RoadWave&apos;s trust and safety process. You can email{' '}
                  <a
                    href="mailto:safety@getroadwave.com"
                    className="text-flame underline-offset-2 hover:underline"
                  >
                    safety@getroadwave.com
                  </a>{' '}
                  if you have anything to add.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full rounded-lg bg-flame text-night px-4 py-2 text-sm font-semibold hover:bg-amber-400 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
