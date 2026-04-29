import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Trust & Safety Protocol — RoadWave',
  description:
    "How RoadWave handles reports of harassment, threats, underage use, stalking, fake profiles, or danger. Reports are reviewed as part of RoadWave's trust and safety process.",
  // Reachable by direct URL (linked from /safety) but not promoted in nav.
  robots: { index: false, follow: false },
}

export default function SafetyProtocolPage() {
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
            <Eyebrow>Internal · Trust &amp; Safety Protocol</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              How we handle reports.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              What we do, in what order, when something gets flagged.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="Immediate danger comes first">
            <p>
              If anyone — a guest, an owner, a bystander — is in immediate
              physical danger, the response order is:
            </p>
            <Ordered
              items={[
                'Call 911 (or local emergency services).',
                'Notify campground staff on site.',
                'Then report it to RoadWave so we can act on the account side.',
              ]}
            />
            <p>
              RoadWave is not an emergency service. We cannot dispatch police,
              EMS, or campground security, and we do not respond in real time.
            </p>
          </Section>

          <Section title="What gets reported here">
            <p>
              The in-app <strong className="text-cream">Report</strong> button
              and{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              are the right channels for:
            </p>
            <Bullets
              items={[
                'Harassment, including unwanted contact after a block or no wave-back.',
                'Threats of violence, intimidation, or coercion.',
                'Suspected underage users (RoadWave is 18+).',
                'Stalking or repeated location-seeking behavior.',
                'Fake or impersonation profiles.',
                'Anything else that signals real-world danger.',
              ]}
            />
          </Section>

          <Section title="What happens when you file a report">
            <Ordered
              items={[
                'The report lands in the trust and safety queue with a copy of the relevant context (profile, message, wave history).',
                "RoadWave reviews reports as part of its trust and safety process. We do not promise 24/7 review or a guaranteed response time.",
                'The reported account may be suspended pending review when the report indicates potential harm to others.',
                "Action — including warning, suspension, permanent removal, or no action — is decided based on what the review finds.",
                'We close the loop with the reporter by email when the review is complete, where doing so is appropriate.',
              ]}
            />
          </Section>

          <Section title="Logging and preservation">
            <p>
              Serious reports — those involving threats, suspected underage
              use, stalking, or potential criminal conduct — are logged and
              preserved beyond the normal account-deletion window. We retain:
            </p>
            <Bullets
              items={[
                'A copy of the reported content (profile fields, messages, waves).',
                'The report itself and any context the reporter provided.',
                'Our internal review notes and the action taken.',
                'Account metadata sufficient to identify the actor if asked under valid legal process.',
              ]}
            />
            <p>
              Preservation does not mean public disclosure. Logged material is
              kept for safety and legal purposes only.
            </p>
          </Section>

          <Section title="Cooperation with law enforcement">
            <p>
              RoadWave may cooperate with law enforcement when:
            </p>
            <Bullets
              items={[
                'We receive a valid legal request (subpoena, court order, search warrant).',
                'We have a good-faith belief that disclosure is necessary to prevent imminent harm.',
                'A user explicitly authorizes us to share their report and supporting data.',
              ]}
            />
            <p>
              We narrow disclosures to what the request actually covers and
              push back on overreach where we can.
            </p>
          </Section>

          <Section title="Suspension pending review">
            <p>
              Suspension before a final decision is a safety measure, not a
              verdict. Suspended accounts:
            </p>
            <Bullets
              items={[
                'Cannot wave, message, or appear in nearby lists.',
                'Retain their data while review is in progress.',
                'Are notified by email at the address on file, unless notification would risk tipping off someone in an active safety situation.',
                'Can request review of the suspension by replying to that email.',
              ]}
            />
          </Section>

          <Section title="What we do NOT promise">
            <Bullets
              items={[
                '24/7 response. We are a small team and reviews happen during normal working hours.',
                'Immediate action. Suspension during review is a possibility, not a guarantee.',
                'Background checks on users. RoadWave does not vet identities or run criminal-record checks.',
                'On-site security. We are an app — we do not provide guards, patrols, or campground supervision.',
              ]}
            />
          </Section>

          <Section title="Internal contact">
            <p>
              For trust and safety matters, email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              with &ldquo;Trust &amp; Safety&rdquo; in the subject line. Real
              human, real reply.
            </p>
            <p className="text-xs text-mist/70 pt-2">
              See also: the public{' '}
              <Link
                href="/safety"
                className="text-flame underline-offset-2 hover:underline"
              >
                Safety
              </Link>{' '}
              page for guests, and the{' '}
              <Link
                href="/campground-safety"
                className="text-flame underline-offset-2 hover:underline"
              >
                Campground Owner Safety Overview
              </Link>
              .
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

function Ordered({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((b, i) => (
        <li key={b} className="flex items-start gap-3 text-mist">
          <span
            className="grid h-6 w-6 place-items-center rounded-md bg-flame/10 text-flame text-xs font-bold shrink-0"
            aria-hidden
          >
            {i + 1}
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ol>
  )
}
