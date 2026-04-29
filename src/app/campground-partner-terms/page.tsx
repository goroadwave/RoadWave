import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Campground Partner Terms — RoadWave',
  description:
    'The terms that govern campgrounds offering RoadWave to their guests. Conduct expectations, data-access limits, and termination conditions.',
}

export default function PartnerTermsPage() {
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
            <Eyebrow>Campground Partner Terms</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              The partner agreement.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              The terms that apply when a campground offers RoadWave to its
              guests. Plain English. Read it.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="Who this applies to">
            <p>
              These Campground Partner Terms (&ldquo;Partner Terms&rdquo;) cover
              any campground, RV park, resort, or property
              (&ldquo;Campground Partner&rdquo;) that has been onboarded to
              RoadWave and given access to the partner dashboard, QR code, or
              other partner functionality. They are in addition to RoadWave&apos;s
              general{' '}
              <Link
                href="/terms"
                className="text-flame underline-offset-2 hover:underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="text-flame underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              By creating a partner account, posting RoadWave&apos;s QR code at
              a campground, or otherwise using the partner dashboard,
              Campground Partner agrees to these Partner Terms.
            </p>
          </Section>

          <Section title="Partner Conduct and Restrictions">
            <p>
              The following clauses govern how Campground Partner may and may
              not use RoadWave. They apply individually and collectively.
            </p>

            <Clause
              n={1}
              title="Immediate termination"
              body="RoadWave may suspend or terminate a campground's access immediately if the campground, its owners, managers, employees, contractors, hosts, or representatives have misused RoadWave, misrepresented RoadWave to guests, attempted to access or identify guest information improperly, violated guest privacy, created safety concerns, or otherwise violated these Partner Terms."
            />

            <Clause
              n={2}
              title="No guest surveillance"
              body="Campground Partner may not use RoadWave to monitor, track, identify, profile, investigate, or surveil guests beyond the limited functionality expressly provided by RoadWave."
            />

            <Clause
              n={3}
              title="No mandatory use"
              body="Campground Partner may not require guests to use RoadWave as a condition of staying at the campground. RoadWave must remain optional for all guests."
            />

            <Clause
              n={4}
              title="No misrepresentation"
              body="Campground Partner may not represent that RoadWave provides background checks, emergency response, security services, guest screening, identity verification, law enforcement services, or guaranteed safety."
            />

            <Clause
              n={5}
              title="Limited data access"
              body="Campground Partner may only access information RoadWave makes available through the partner dashboard and may not attempt to obtain guest exact site numbers, private messages, personal contact information, or location details unless expressly authorized by the guest or required by valid legal process."
            />

            <Clause
              n={6}
              title="Staff responsibility"
              body="Campground Partner is responsible for the actions of its owners, employees, contractors, camp hosts, managers, agents, and representatives who access or promote RoadWave."
            />

            <Clause
              n={7}
              title="Guest complaints"
              body="RoadWave may investigate complaints from guests regarding campground misuse, misrepresentation, privacy violations, harassment, retaliation, or unsafe use of the platform."
            />
          </Section>

          <Section title="Liability and scope">
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
              For a plain-language overview of how RoadWave fits alongside
              campground operations, see the{' '}
              <Link
                href="/campground-safety"
                className="text-flame underline-offset-2 hover:underline"
              >
                Campground Owner Safety Overview
              </Link>
              .
            </p>
          </Section>

          <Section title="Changes to these Partner Terms">
            <p>
              When we update these Partner Terms in a meaningful way, we&apos;ll
              email every Campground Partner at the address on file at least
              14 days before the change takes effect. Continued use of the
              partner dashboard after a change is acceptance of the new terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, concerns, or to report a partner issue, email{' '}
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

function Clause({
  n,
  title,
  body,
}: {
  n: number
  title: string
  body: string
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-5 space-y-2">
      <div className="flex items-center gap-3">
        <span
          className="grid h-7 w-7 place-items-center rounded-md bg-flame/10 text-flame text-xs font-bold shrink-0"
          aria-hidden
        >
          {n}
        </span>
        <h3 className="font-semibold text-cream">{title}</h3>
      </div>
      <p className="text-mist leading-relaxed">{body}</p>
    </div>
  )
}
