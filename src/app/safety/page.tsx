import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Safety on RoadWave — Stay safe. Stay in control.',
  description:
    'Practical safety guidance for RoadWave users. Meet in public, control your visibility, report what feels off, and call 911 in an emergency.',
}

export default function SafetyPage() {
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
            <Eyebrow>Safety on RoadWave</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Stay safe. Stay in control.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              The best safety tool is your own judgment. RoadWave is built to
              respect it.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="If you're in danger right now">
            <p>
              Call <strong className="text-cream">911</strong>. Then alert
              campground staff. RoadWave is not an emergency service and cannot
              dispatch help.
            </p>
          </Section>

          <Section title="RoadWave is 18+ only">
            <p>
              <strong className="text-cream">You must be 18 or older</strong>{' '}
              to use RoadWave. We do not knowingly allow anyone under 18 on the
              platform. If you believe a minor has signed up, email{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>{' '}
              and we&apos;ll remove the account.
            </p>
          </Section>

          <Section title="Meeting other campers">
            <Bullets
              items={[
                'Meet in visible public areas of the campground — the bathhouse path, the camp store, the fire ring, the laundry room.',
                "Keep your first hello short. You're seeing if the vibe matches, not committing to anything.",
                'Trust your gut. If something feels off, walk away. You owe no one a second wave.',
              ]}
            />
          </Section>

          <Section title="Protect your location">
            <Bullets
              items={[
                "Don't share your exact site number unless you've decided you want to. RoadWave never shares it for you.",
                "Suggest a meeting spot that isn't your campsite for a first hello.",
                "If you're solo and want extra space, use Quiet or Invisible mode while you settle in.",
              ]}
            />
          </Section>

          <Section title="Use your privacy modes">
            <p>Four modes, switch in one tap:</p>
            <Bullets
              items={[
                'Visible — you appear in nearby lists at your campground.',
                'Quiet — hidden from nearby lists, but you can still wave first if you choose to.',
                "Invisible — completely off the grid. Browse without leaving a trace and without anyone knowing you're even on RoadWave.",
                'Campground Updates Only — you can see official campground updates and meetup prompts without appearing to other campers, sending waves, or opening private hellos.',
              ]}
            />
            <p>
              No one is notified when you change modes. No one sees a missed
              wave when you&apos;re on Quiet.
            </p>
          </Section>

          <Section title="If something feels off, report it">
            <p>
              Use the in-app <strong className="text-cream">Report</strong>{' '}
              button on a profile or message thread. Tell us what happened in
              your own words — harassment, threats, fake-looking profile,
              someone underage, anything that doesn&apos;t belong here.
            </p>
            <p>
              Reports are reviewed as part of RoadWave&apos;s trust and safety
              process. Reported accounts may be suspended pending review.
              Serious reports are logged and preserved, and we may cooperate
              with law enforcement when there&apos;s a clear safety reason to.
            </p>
            <p>
              You can read the full process on our{' '}
              <Link
                href="/safety-protocol"
                className="text-flame underline-offset-2 hover:underline"
              >
                Trust &amp; Safety Protocol
              </Link>
              {' '}page.
            </p>
          </Section>

          <Section title="Block anyone, anytime">
            <p>
              You can block another camper from your settings. Blocked accounts
              cannot see you, wave at you, or message you again — and the block
              persists across campgrounds and seasons.
            </p>
          </Section>

          <Section title="RoadWave is not…">
            <Bullets
              items={[
                'An emergency service. Dial 911 for emergencies.',
                "Campground staff. They're your first call for on-site issues.",
                'A background-check service. We do not vet the people who sign up.',
                'A live moderator. Reports are reviewed as part of our trust and safety process, not in real time.',
              ]}
            />
          </Section>

          <Section title="Data deletion request">
            <p>
              To delete your RoadWave account and data, email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              from the email address tied to your account and request
              deletion. We&apos;ll confirm the request and delete your
              account data within 7 business days. An in-app delete button
              is planned.
            </p>
          </Section>

          <Section title="Questions or concerns">
            <p>
              Safety reports, legal requests, account issues, or urgent
              concerns:{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>
              . A real person reads every message.
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
