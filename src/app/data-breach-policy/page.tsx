import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Data Breach Response Policy — RoadWave',
  description:
    "RoadWave's written procedure for detecting, containing, and disclosing security incidents involving user data.",
}

export default function DataBreachPolicyPage() {
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
            <Eyebrow>Data Breach Response Policy</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              How we respond when something is wrong.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              The written procedure we follow for any suspected security
              incident affecting user data.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="Scope">
            <p>
              This policy applies to any suspected unauthorized access to,
              acquisition of, loss of, or disclosure of personal information
              held by RoadWave — whether through external attack, internal
              error, third-party vendor compromise, or lost / stolen device
              or credential. It also covers near-miss incidents that did not
              result in disclosure but warrant the same containment posture.
            </p>
          </Section>

          <Section title="1. Detect and triage">
            <Ordered
              items={[
                'Anyone at RoadWave (or a vendor, researcher, or user) who suspects a security incident reports it to safety@getroadwave.com or directly to the founder.',
                'We aim to acknowledge and triage security reports as soon as reasonably practical during working hours. For serious incidents, we begin containment as quickly as possible once discovered. The incident is logged with a severity level — Low, Medium, High, or Critical — based on what data may be affected and whether the issue is ongoing.',
                'If the report is Medium or above, the incident is treated as Active until ruled out. We do not wait for confirmation to start containment.',
              ]}
            />
          </Section>

          <Section title="2. Notify the right people">
            <p>
              For any incident at Medium severity or above, the following are
              notified immediately:
            </p>
            <Bullets
              items={[
                'RoadWave founder / incident lead — point of accountability for the response.',
                'Engineering — for technical containment and forensics.',
                "Counsel — when there is a reasonable likelihood that personal information was involved or that breach-notification statutes are triggered.",
                'Hosting, database, email, DNS, and infrastructure providers — notified when their platform is implicated or when credential rotation depends on them.',
                'Law enforcement — when the incident involves unauthorized intrusion, extortion, or credible threats. See our Law Enforcement Request Policy.',
              ]}
            />
          </Section>

          <Section title="3. Lock systems down">
            <p>
              The first response is to stop the bleeding. Depending on the
              nature of the incident, containment may include:
            </p>
            <Bullets
              items={[
                'Revoking all active sessions and forcing re-authentication.',
                'Rotating database credentials, service-role keys, and API tokens for any implicated provider.',
                'Disabling the affected feature, route, or RPC at the platform level.',
                "Pausing inbound writes (read-only mode) when integrity of the data is in question.",
                'Cutting off third-party integrations until they can be verified.',
              ]}
            />
            <p>
              If the suspected vector is a compromised credential, the
              credential is rotated before any further investigation. If the
              vector is unknown, we treat all production secrets as
              presumptively compromised and rotate them.
            </p>
          </Section>

          <Section title="4. Preserve evidence">
            <p>
              Before remediation overwrites state, we preserve:
            </p>
            <Bullets
              items={[
                'Server logs (application logs, edge logs, database logs) covering the incident window.',
                'Audit trails of administrative actions taken during the response.',
                'Snapshots of affected database tables.',
                'Any communication that surfaced the incident — bug reports, abuse reports, vendor advisories.',
              ]}
            />
            <p>
              Preserved evidence is held in a write-protected location for
              at least the longer of: the duration of the active
              investigation, any preservation request received under our
              law enforcement policy, or two years.
            </p>
          </Section>

          <Section title="5. Investigate and remediate">
            <Ordered
              items={[
                'Reproduce the issue in a non-production environment where possible.',
                "Determine root cause — what allowed the access, what data was accessible, and over what window.",
                'Patch the vulnerability and verify the patch holds under the same conditions that surfaced it.',
                'Audit related code paths for the same class of issue.',
                'Re-deploy and confirm production telemetry is clean.',
              ]}
            />
          </Section>

          <Section title="6. Notify affected users">
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-5">
              <p className="text-cream leading-relaxed">
                RoadWave will notify affected users promptly in the event of
                a breach involving their personal information.
              </p>
            </div>
            <p>Concretely:</p>
            <Bullets
              items={[
                'Notification is sent to the email address on file for each affected user, from safety@getroadwave.com.',
                'The notification describes — in plain English — what data was involved, when the incident happened, what we believe the cause was, what we have done to remediate, and what (if anything) the user should do.',
                'Where required by law, regulators are notified within statutory timelines (e.g. GDPR Article 33 — within 72 hours of becoming aware where the incident is likely to result in a risk to rights and freedoms).',
                'Public disclosure is made on the RoadWave site for incidents affecting a significant portion of the user base, and where doing so does not interfere with an ongoing law enforcement investigation.',
              ]}
            />
            <p>
              We default to over-notifying rather than under-notifying. If
              we&apos;re unsure whether a given user&apos;s data was
              affected, we tell them anyway and explain the uncertainty.
            </p>
          </Section>

          <Section title="7. Post-incident review">
            <p>
              Within 30 days of an incident&apos;s closure, the incident
              lead writes a post-incident review covering: timeline, root
              cause, what worked, what didn&apos;t, follow-up work, and
              concrete changes to this policy if the response surfaced a
              gap. The review is shared with the team and retained for at
              least three years.
            </p>
          </Section>

          <Section title="Reporting an incident">
            <p>
              If you&apos;ve found a vulnerability, suspect an account
              compromise, or believe your data has been affected, write to{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>{' '}
              with as much detail as you can share. We aim to acknowledge
              and triage security reports as soon as reasonably practical
              during working hours. For serious incidents, we begin
              containment as quickly as possible once discovered.
            </p>
            <p className="text-xs text-mist/70 pt-2">
              See also: our{' '}
              <Link
                href="/law-enforcement"
                className="text-flame underline-offset-2 hover:underline"
              >
                Law Enforcement Request Policy
              </Link>{' '}
              and{' '}
              <Link
                href="/safety-protocol"
                className="text-flame underline-offset-2 hover:underline"
              >
                Trust &amp; Safety Protocol
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
