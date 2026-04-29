import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Privacy Policy — RoadWave',
  description:
    'How RoadWave handles your data. Plain language, no dark patterns.',
}

export default function PrivacyPolicyPage() {
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
            <Eyebrow>Privacy Policy</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Your data, your call.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              We built RoadWave because the alternatives leak everywhere.
              Here&apos;s exactly what we do — and don&apos;t do — with your information.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="The short version">
            <p>
              We collect the minimum we need to make a wave work. We never sell
              your data. We never share your exact location with other campers.
              You can delete your account and everything tied to it whenever you
              want.
            </p>
          </Section>

          <Section title="What we collect">
            <p>When you use RoadWave, we collect:</p>
            <Bullets
              items={[
                'Your email address — used to sign you in and send confirmations.',
                "Your username and display name — what other campers see when you appear in a nearby list.",
                "Your travel style and interests — used to surface compatible neighbors.",
                "Your check-in — the campground you scanned into and when. Not your GPS.",
                'Your wave history — who you waved at, who waved back, when.',
                'Optional profile fields — rig type, hometown, years RVing, pet info, a personal note. Each one has its own share toggle.',
              ]}
            />
          </Section>

          <Section title="How we use it">
            <p>
              Strictly to make the app work. We surface you to other campers at
              your campground when your privacy mode allows it, match mutual
              waves, remember crossed paths so you can find someone again next
              season, and send you the occasional product email you can opt out
              of with one click.
            </p>
            <p>
              We do not run ads. We do not sell to data brokers. We do not feed
              your information into any model training pipeline.
            </p>
          </Section>

          <Section title="What we never share">
            <Bullets
              items={[
                'Your exact site number. Ever. Other campers see that you are at the same campground — never which loop or pad.',
                'Your real name, unless you put it in your display name yourself.',
                'Your email address.',
                'Anything you have toggled off in your sharing settings.',
                'Your data with advertisers, brokers, or third-party trackers.',
              ]}
            />
          </Section>

          <Section title="Privacy modes">
            <p>
              You always have three modes available, and you can switch in one
              tap:
            </p>
            <Bullets
              items={[
                'Visible — you appear in nearby lists at your campground.',
                'Quiet — you are hidden from nearby lists, but you can still wave first.',
                'Invisible — you are completely off the grid. Browse without leaving a trace.',
              ]}
            />
          </Section>

          <Section title="How long we keep it">
            <p>
              Check-ins automatically expire 24 hours after you scan in. Wave
              history and crossed paths persist as long as your account does —
              that&apos;s the whole point of remembering people you met. Delete
              your account and we delete everything within 30 days.
            </p>
          </Section>

          <Section title="Deleting your data">
            <p>
              Email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              from the address tied to your account and ask. We&apos;ll
              confirm and delete within 7 business days. We&apos;re a small team
              — we read every email.
            </p>
            <p>
              An in-app delete button is on the roadmap. In the meantime, email
              is the fastest path.
            </p>
          </Section>

          <Section title="Cookies and analytics">
            <p>
              We use first-party cookies to keep you signed in, and Vercel
              Analytics to count page views in aggregate. That&apos;s it. No
              third-party tracking pixels, no cross-site trackers.
            </p>
          </Section>

          <Section title="Children">
            <p>
              RoadWave is not for anyone under 16. If you believe a minor has
              created an account, email us and we&apos;ll remove it.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              If we make a meaningful change, we&apos;ll email everyone with an
              account before it takes effect. The minor edits — fixing a typo,
              clarifying a sentence — we&apos;ll just update the date at the top.
            </p>
          </Section>

          <Section title="Get in touch">
            <p>
              Anything unclear? Concerned about something specific? Email{' '}
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
