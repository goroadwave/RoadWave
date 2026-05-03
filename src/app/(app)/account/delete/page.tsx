import Link from 'next/link'
import type { Metadata } from 'next'
import { DeleteAccountForm } from '@/components/settings/delete-account-form'
import { PageHeading } from '@/components/ui/page-heading'

// Dedicated account-deletion route. Lives under the (app) route group
// so the (app) layout enforces login — anonymous viewers get bounced
// to /login by the layout's auth gate before this page ever renders.
//
// Mirrors the older /settings/delete-account page, which now redirects
// here. Same form + same server action — just a more discoverable URL.

export const metadata: Metadata = {
  title: 'Delete account — RoadWave',
  description:
    'Permanently delete your RoadWave account and all associated data.',
  robots: { index: false, follow: false },
}

export default function DeleteAccountPage() {
  return (
    <div className="max-w-xl space-y-6">
      <PageHeading
        eyebrow="Account"
        title="Delete your account"
        subtitle="Read carefully — this can't be undone."
      />

      <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-5 space-y-3">
        <h2 className="font-semibold text-cream">What gets deleted</h2>
        <p className="text-sm text-mist leading-relaxed">
          Deleting your account will permanently remove your profile,
          check-in history, waves, and all personal data from RoadWave.
          This cannot be undone.
        </p>
        <ul className="text-sm text-mist space-y-1.5">
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-flame mt-0.5">•</span>
            <span>Your profile — display name, username, rig info, hometown, interests, avatar.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-flame mt-0.5">•</span>
            <span>Every check-in you&apos;ve ever made.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-flame mt-0.5">•</span>
            <span>Your wave history and every crossed path with another camper.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-flame mt-0.5">•</span>
            <span>All messages you&apos;ve sent or received.</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="text-flame mt-0.5">•</span>
            <span>Your sign-in itself — you won&apos;t be able to log back in.</span>
          </li>
        </ul>
      </section>

      <section className="rounded-2xl border border-white/5 bg-card p-5 space-y-3">
        <h2 className="font-semibold text-cream">What we keep</h2>
        <p className="text-sm text-mist leading-relaxed">
          For compliance, we retain a small record of the deletion itself — your
          user id, an email snapshot, the timestamp, and your request metadata.
          No profile or activity data is kept.
        </p>
        <p className="text-sm text-mist leading-relaxed">
          We&apos;ll also email a confirmation to the address on file from{' '}
          <a
            href="mailto:hello@getroadwave.com"
            className="text-flame underline-offset-2 hover:underline"
          >
            hello@getroadwave.com
          </a>{' '}
          so you have a receipt.
        </p>
      </section>

      <DeleteAccountForm />

      <p className="text-center text-sm text-mist">
        Changed your mind?{' '}
        <Link
          href="/settings/privacy"
          className="font-semibold text-flame underline-offset-2 hover:underline"
        >
          Back to settings
        </Link>
      </p>
    </div>
  )
}
