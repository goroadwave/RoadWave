import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Campground Owner Safety Overview — RoadWave',
  description:
    'A short, plain-language overview of how RoadWave protects guests and how it fits alongside your existing operations.',
}

export default function CampgroundSafetyPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/campgrounds"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← For campgrounds
        </Link>
      </header>

      <main className="px-4 py-10 sm:py-16">
        <article className="mx-auto max-w-2xl space-y-8">
          <div className="space-y-3 text-center">
            <Eyebrow>For campground owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              Safety, simply.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              How RoadWave protects guests, and how it fits alongside what
              you&apos;re already doing.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="Optional & 18+ only">
            <p>
              RoadWave is an optional amenity. No guest is required to use it
              to stay at your campground. Sign-ups confirm they are{' '}
              <strong className="text-cream">18 or older</strong>; suspected
              underage accounts can be reported and removed.
            </p>
          </Section>

          <Section title="Privacy-first by design">
            <Bullets
              items={[
                "RoadWave never shares a guest's exact site number with another camper.",
                'Real names are optional — guests pick a display name.',
                'Each profile field has its own share toggle (rig type, hometown, pets, note, etc.).',
                'Check-ins automatically expire 24 hours after the QR scan.',
                'No public posts, no open group chat, no advertiser tracking.',
              ]}
            />
          </Section>

          <Section title="Guests control their own visibility">
            <p>Four modes, switched in one tap:</p>
            <Bullets
              items={[
                "Visible — appears in the campground's nearby list.",
                'Quiet — hidden from nearby lists; can still wave first.',
                'Invisible — completely off the grid; no presence at all.',
                'Campground Updates Only — you can see official campground updates and meetup prompts without appearing to other campers, sending waves, or opening private hellos.',
              ]}
            />
            <p>
              Guests can switch modes at any time, and no one is notified when
              they do.
            </p>
          </Section>

          <Section title="Report & block, built in">
            <p>
              Every profile and message thread has a report button. Guests can
              also block another camper from their settings — blocked accounts
              cannot see, wave at, or message them again, across campgrounds
              and seasons.
            </p>
            <p>
              Reports are reviewed as part of RoadWave&apos;s trust and safety
              process. The full process is published at{' '}
              <Link
                href="/safety-protocol"
                className="text-flame underline-offset-2 hover:underline"
              >
                /safety-protocol
              </Link>
              .
            </p>
          </Section>

          <Section title="What RoadWave is not">
            <p>
              RoadWave does not replace campground staff or emergency services.
              For on-site issues, guests are directed to your team first; for
              emergencies, to 911. Each party — RoadWave, the campground, and
              the guest — remains responsible for its own operations.
            </p>
          </Section>

          <Section title="Liability & scope">
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-5">
              <p className="text-cream leading-relaxed">
                RoadWave is an independent third-party guest connection
                platform. RoadWave does not provide security, emergency
                response, background checks, guest supervision, or law
                enforcement services. Each party remains responsible for its
                own operations, staff, property, guests, and legal obligations.
              </p>
            </div>
            <p>
              For the full conduct expectations, see the{' '}
              <Link
                href="/campground-partner-terms"
                className="text-flame underline-offset-2 hover:underline"
              >
                Campground Partner Terms
              </Link>
              .
            </p>
          </Section>

          <Section title="Who to contact">
            <Bullets
              items={[
                'Emergencies on site — 911, then your campground staff.',
                "Guest disputes that don't involve RoadWave use — your existing process.",
                "A guest's RoadWave account behavior — the in-app report button or safety@getroadwave.com.",
                'Anything else (questions, concerns, partnership ideas) — hello@getroadwave.com.',
              ]}
            />
          </Section>

          <Section title="Questions">
            <p>
              Email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
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
