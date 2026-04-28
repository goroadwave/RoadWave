import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Terms of Service — RoadWave',
  description:
    'The rules of the road. Plain-English terms for using RoadWave.',
}

export default function TermsPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
      </header>

      <main className="px-4 py-10 sm:py-16">
        <article className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-3 text-center">
            <Eyebrow>Terms of Service</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              The rules of the road.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Short, plain English, and meant to be read. By using RoadWave you
              agree to all of this.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="Your account">
            <p>
              To use RoadWave you create an account with an email and a
              password. You&apos;re responsible for keeping your password to
              yourself and for everything that happens under your account. If
              someone signs in as you, that&apos;s on you — but tell us right
              away if you think your account has been compromised.
            </p>
            <p>
              You must be at least 16 years old to have an account. One person
              per account; no sharing logins.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>RoadWave is for connecting with neighbors at a campground. Don&apos;t use it to:</p>
            <Bullets
              items={[
                'Harass, threaten, or stalk anyone — at a campground or anywhere else.',
                'Send unsolicited solicitations, spam, MLM pitches, or scams.',
                'Pretend to be someone you are not, including a campground or another camper.',
                'Scrape, copy, or republish data about other users.',
                'Try to break the security of the service or anyone using it.',
                'Post anything illegal, hateful, or sexually explicit.',
              ]}
            />
            <p>
              Break these and we&apos;ll suspend your account. Repeat or
              egregious violations get a permanent ban. We&apos;re a small team
              and we don&apos;t enjoy doing this — please make it unnecessary.
            </p>
          </Section>

          <Section title="The wave mechanic">
            <p>
              RoadWave is built around a mutual-wave model. You wave, they
              wave back, you both opted in. That&apos;s the only way a private
              hello opens. If they don&apos;t wave back, no one finds out you
              waved — including them.
            </p>
            <p>
              That mechanic only works if everyone respects it. Don&apos;t use
              outside channels (DMs from another app, in-person ambushes at the
              campground bathhouse) to pressure someone you waved at when they
              didn&apos;t wave back. Treat a non-response like a non-response.
            </p>
          </Section>

          <Section title="Privacy and data">
            <p>
              Our handling of your information is covered in detail in our{' '}
              <Link
                href="/privacy"
                className="text-flame underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              . The short version: we collect the minimum we need to run the
              app, we never share your exact site number or your real name
              without your input, and you can delete your data by emailing us.
            </p>
          </Section>

          <Section title="Campground partnerships">
            <p>
              Some campgrounds offer RoadWave as an amenity. They have a private
              dashboard that lets them see aggregate stats — how many guests
              checked in, how many waves landed — never individual user data,
              real names, emails, or messages. Your account is yours, not the
              campground&apos;s.
            </p>
            <p>
              When your stay ends, your check-in expires automatically. The
              campground&apos;s view of you closes with it.
            </p>
          </Section>

          <Section title="Service changes and availability">
            <p>
              RoadWave is a small operation. We do our best to keep things
              running, but we don&apos;t guarantee uninterrupted service. We
              may add features, change features, or retire features. If a
              change materially affects you (like an account-affecting feature
              going away), we&apos;ll let you know in advance.
            </p>
          </Section>

          <Section title="No warranties, limited liability">
            <p>
              RoadWave is provided &ldquo;as is.&rdquo; We don&apos;t promise
              the service will meet every need, that other users are who they
              claim to be, or that you&apos;ll click with anyone you wave at.
              Connections are between you and another camper — RoadWave is the
              introduction, not the chaperone. Use your judgment offline.
            </p>
            <p>
              To the extent allowed by law, our liability for anything related
              to the service is capped at the amount you&apos;ve paid us in
              the past 12 months, which for nearly everyone is zero.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You can stop using RoadWave at any time and request deletion by
              emailing us. We can suspend or terminate accounts that violate
              these terms. If we&apos;re ever shutting RoadWave down for good,
              we&apos;ll give every active user at least 30 days&apos; notice
              and a clean way to export anything we&apos;re holding.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              When we update these terms in a meaningful way, we&apos;ll email
              every account at least 14 days before the change takes effect.
              Continuing to use RoadWave after a change is your acceptance of
              the new terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, complaints, kind notes — email{' '}
              <a
                href="mailto:markhalesmith@gmail.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                markhalesmith@gmail.com
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
      <div className="space-y-3 text-mist leading-relaxed">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2 text-mist">
          <span className="text-flame mt-1.5 shrink-0" aria-hidden>
            •
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}
