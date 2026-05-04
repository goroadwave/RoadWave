import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

// Public account-deletion docs page. Linked from the global footer's
// Guests column so anyone (signed-in or not, app-store reviewers,
// people who lost access to their account) can find the deletion path
// without authenticating first.
//
// The actual destructive form lives at /account/delete inside the (app)
// route group — login-protected, type-DELETE-to-confirm. This page
// links to it for the signed-in path and provides the email fallback
// for people who can't sign in.

export const metadata: Metadata = {
  title: 'Account deletion — RoadWave',
  description:
    'How to delete your RoadWave account and the data we keep for compliance.',
  robots: { index: true, follow: true },
}

export default function AccountDeletionPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm">
            <li>
              <Link
                href="/safety"
                className="text-mist hover:text-cream transition-colors"
              >
                Safety
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-mist hover:text-cream transition-colors"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-mist hover:text-cream transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="px-4 py-10 sm:py-16">
        <article className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-3 text-center">
            <Eyebrow>Account</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Delete your RoadWave account.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Two paths. Same outcome. No drama.
            </p>
          </div>

          <Section title="Email-based deletion">
            <p>
              Send an email to{' '}
              <a
                href="mailto:hello@getroadwave.com?subject=Account%20deletion%20request"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              from the email address tied to your RoadWave account, with the
              subject line <strong className="text-cream">&ldquo;Account
              deletion request&rdquo;</strong>.
            </p>
            <p>
              We verify the request matches the address on file, then delete
              your account and all associated data — profile, check-ins, wave
              history, crossed paths, and messages — within{' '}
              <strong className="text-cream">7 business days</strong>. You
              receive a confirmation email when the deletion is complete.
            </p>
            <p className="text-sm text-mist">
              This is the right path if you can&rsquo;t sign in (lost password
              without a recovery email, suspended account, locked out for any
              reason), or if you simply prefer it.
            </p>
          </Section>

          <Section title="In-app deletion (signed-in users)">
            <p>
              If you&rsquo;re still able to sign in, you can delete your
              account immediately from inside the app at{' '}
              <Link
                href="/account/delete"
                className="text-flame underline-offset-2 hover:underline"
              >
                /account/delete
              </Link>
              . You&rsquo;ll be asked to type{' '}
              <code className="rounded bg-night/60 px-1.5 py-0.5 text-flame text-[13px]">
                DELETE
              </code>{' '}
              to confirm, after which your data is removed immediately and
              you receive a confirmation email as a receipt.
            </p>
            <p className="text-sm text-mist">
              Same outcome as the email path — just faster.
            </p>
          </Section>

          <Section title="What gets deleted">
            <Bullets
              items={[
                'Your profile — display name, username, rig info, hometown, interests, avatar.',
                "Every check-in you've ever made.",
                'Your wave history and every crossed path with another camper.',
                'All messages you have sent or received.',
                "Your sign-in itself — you won't be able to log back in with that email.",
              ]}
            />
          </Section>

          <Section title="What we keep">
            <p>
              For compliance, we retain a small record of the deletion itself
              — your former user id, an email snapshot, the timestamp of the
              deletion, and request metadata (IP, user agent). No profile or
              activity data is kept.
            </p>
            <p>
              This compliance row is required so we can answer
              &ldquo;was this account deleted, and when?&rdquo; questions
              from law enforcement, regulators, or the original user
              themselves. It is never used to advertise to you, and it
              cannot be used to reconstruct your activity.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              For anything else about deletion, write to{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>
              . Real human, real reply.
            </p>
          </Section>
        </article>
      </main>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-cream">
        {title}
      </h2>
      <div className="space-y-3 text-cream/90 leading-relaxed">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2 text-cream/90">
          <span aria-hidden className="text-flame mt-0.5">
            •
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}
