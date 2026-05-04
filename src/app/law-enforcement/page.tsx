import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Law Enforcement Request Policy — RoadWave',
  description:
    "How RoadWave handles requests from law enforcement for user data, including the emergency-disclosure exception.",
}

export default function LawEnforcementPage() {
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
            <Eyebrow>Law Enforcement Request Policy</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              How we respond to legal process.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              We require valid legal process. We make narrow good-faith
              exceptions for true emergencies.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="The default rule">
            <p>
              RoadWave does not voluntarily disclose user account information
              or content. We require <strong className="text-cream">valid
              legal process</strong> appropriate to the type of information
              requested before we will produce records to law enforcement.
              Examples:
            </p>
            <Bullets
              items={[
                'Subpoena — for basic subscriber information (account creation date, email on file, sign-in IP).',
                'Court order under 18 U.S.C. § 2703(d) (or equivalent) — for transactional records (check-in metadata, wave/match metadata, message metadata).',
                'Search warrant — for content of communications (message bodies, profile fields, anything not metadata).',
                'A valid international or state-equivalent process for non-U.S. requests.',
              ]}
            />
            <p>
              We narrow disclosures to what the request actually covers and
              push back on requests that are overbroad, unduly burdensome, or
              outside the scope of what the legal instrument authorizes.
            </p>
          </Section>

          <Section title="User notice">
            <p>
              Where consistent with the law and the legal instrument, we
              attempt to notify the affected user before disclosing their
              information so they have the opportunity to challenge the
              request. We will not provide notice when notice is prohibited
              by court order, when there is a clear indication of an ongoing
              criminal investigation in which notice would be
              counterproductive, or when notice would risk imminent harm.
            </p>
          </Section>

          <Section title="Emergency disclosure exception">
            <div className="rounded-2xl border border-flame/30 bg-flame/[0.04] p-5">
              <p className="text-cream leading-relaxed">
                RoadWave may preserve and disclose limited information in
                good faith when RoadWave believes disclosure is necessary to
                address an emergency involving danger of death or serious
                physical injury.
              </p>
            </div>
            <p>
              Emergency disclosures are voluntary, narrow, and based on what
              we believe in good faith is necessary to prevent the
              imminent harm. They are made under{' '}
              <span className="text-cream">18 U.S.C. § 2702(b)(8)</span> and
              equivalent emergency provisions in other jurisdictions.
            </p>
            <p>
              Law enforcement seeking emergency disclosure should email{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>{' '}
              with the subject line{' '}
              <span className="text-cream">&ldquo;EMERGENCY DISCLOSURE
              REQUEST&rdquo;</span>, the requesting officer&apos;s contact
              information and agency, and a description of the emergency
              circumstances. We may follow up by phone to verify identity and
              the nature of the emergency before producing any information.
            </p>
          </Section>

          <Section title="Preservation requests">
            <p>
              We will preserve account records for{' '}
              <strong className="text-cream">90 days</strong> upon receipt of
              a written preservation request from a law enforcement agency,
              and may extend the preservation period once for an additional
              90 days upon a renewed request. Preservation does not produce
              records — formal legal process is still required to compel
              disclosure.
            </p>
          </Section>

          <Section title="What we typically have">
            <p>
              Before sending a request, please consider whether RoadWave is
              likely to have the information you&apos;re looking for. We
              maintain limited data, organized around two distinct subjects:
              individual <strong className="text-cream">campers</strong>{' '}
              (guest accounts) and{' '}
              <strong className="text-cream">campground owners</strong>{' '}
              (business accounts). The records and retention rules differ.
            </p>

            <h3 className="font-semibold text-cream pt-2">
              For camper (guest) accounts
            </h3>
            <Bullets
              items={[
                "Account info: email on file, account creation date, last sign-in time. No real names; we don't collect them.",
                'Profile fields the user chose to enter (display name, hometown, rig type, interests) — but only if not deleted by the user.',
                "Check-in records: which campground, when, and when the 24-hour window expired or was cancelled. No exact site number — we don't collect it.",
                'Mutual waves and crossed-path history are retained while your account remains active so RoadWave can remember people you connected with. Unmatched wave attempts are not shown to the other person and are not retained longer than needed to operate the feature, prevent abuse, and maintain system integrity. Wave and crossed-path records are deleted when you delete your account, except for limited trust, safety, legal, or compliance records described in this policy.',
                'Message records: text content of messages between mutually-matched users. RoadWave is end-to-server (not end-to-end) encrypted, so plaintext is recoverable.',
                'Consent records (legal_acks): per-field timestamps for age/terms/privacy/community-rules acceptance + the version strings in force at the time, plus IP and user-agent at signup.',
                'Trust & Safety records: reports the user filed or that were filed against them, with reviewing notes.',
              ]}
            />

            <h3 className="font-semibold text-cream pt-2">
              For campground owner (business) accounts
            </h3>
            <Bullets
              items={[
                'Business contact info: business email, owner-supplied display name, optional phone number.',
                'Campground entity info: legal name, public slug, city/region/timezone, optional logo URL, optional website, optional physical address (only if the owner chose to enter one).',
                "Billing metadata: Stripe customer ID, subscription ID, plan, subscription status, current period end. We do not store card numbers — Stripe is the system of record for payment instruments.",
                'Bulletins and meetups the owner posted, with timestamps.',
                'Aggregate engagement stats — counts of check-ins, bulletin views, mutual waves at the owner’s campground. Aggregate only; never tied to specific campers.',
              ]}
            />

            <p className="pt-2">
              We do <strong className="text-cream">not</strong> have: real
              names of campers (unless self-supplied), phone numbers (other
              than what an owner self-supplies for their campground),
              government IDs, residential addresses, payment card numbers,
              or precise real-time GPS coordinates of any user.
            </p>
          </Section>

          <Section title="Service of process">
            <p>
              RoadWave does not accept service of process by phone, fax, or
              social media. Send written legal process to{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>{' '}
              with the subject line{' '}
              <span className="text-cream">&ldquo;LEGAL PROCESS&rdquo;</span>{' '}
              and a scanned copy of the instrument attached. Acceptance via
              email does not waive any legal defenses or objections.
            </p>
          </Section>

          <Section title="Costs">
            <p>
              Where permitted by law, RoadWave may charge a reasonable cost
              for assembling and producing records. Estimates are provided
              before any work is done.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              For policy questions or to confirm receipt of a request, email{' '}
              <a
                href="mailto:safety@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                safety@getroadwave.com
              </a>
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
