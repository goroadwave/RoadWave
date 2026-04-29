import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Community Rules — RoadWave',
  description:
    'How we expect every RoadWave guest to behave. Eight rules, plain English, agreed to at signup.',
}

export default function CommunityRulesPage() {
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
            <Eyebrow>Community Rules</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              The RoadWave Code of Conduct.
            </h1>
            <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
              Eight rules. Read them, agree to them, ride with them.
            </p>
            <p className="text-xs text-mist/70">Last updated: April 2026</p>
          </div>

          <Section title="What you're agreeing to">
            <p>
              Every RoadWave user agrees to these rules at signup. They exist
              to keep RoadWave a place worth being on. Break them and your
              account can be suspended or removed; serious violations are
              logged and may be referred to law enforcement under our{' '}
              <Link
                href="/safety-protocol"
                className="text-flame underline-offset-2 hover:underline"
              >
                Trust &amp; Safety Protocol
              </Link>
              .
            </p>
          </Section>

          <section className="space-y-3">
            <Rule
              n={1}
              title="Be 18 or older"
              body="You must be 18 years of age or older to use RoadWave. Suspected underage accounts will be removed."
            />
            <Rule
              n={2}
              title="No harassment, ever"
              body="No harassment, stalking, threats, sexual pressure, hate speech, or impersonation. Not in waves, not in messages, not anywhere on RoadWave."
            />
            <Rule
              n={3}
              title="Don't try to find anyone's campsite"
              body="Do not use RoadWave to locate someone's exact campsite. Site numbers, loop letters, and pad locations are off-limits unless the other person has chosen to share them."
            />
            <Rule
              n={4}
              title="No pressure to meet"
              body="Do not pressure anyone to meet. A wave is an opening, not an obligation. People get to take their time, change their minds, or stay strangers."
            />
            <Rule
              n={5}
              title="Take a no as a no"
              body="Do not contact someone again after they block you, ignore your wave, or decline. No alternate accounts, no second tries through another app, no in-person follow-ups at the bathhouse."
            />
            <Rule
              n={6}
              title="Meet in public"
              body="First meetups should happen in visible public campground areas — the camp store, the fire ring, the bathhouse path, the laundry room. Save private meet-ups for after you actually know each other."
            />
            <Rule
              n={7}
              title="Emergencies are 911"
              body="Emergencies go to 911 and campground staff. RoadWave is not an emergency service and cannot dispatch help."
            />
            <Rule
              n={8}
              title="Respect, by default"
              body="Treat other guests with respect. Different rigs, different routes, different reasons for being out here. The bar is simple: behave like a neighbor."
            />
          </section>

          <Section title="If something goes wrong">
            <p>
              Use the in-app <strong className="text-cream">Report</strong>{' '}
              button on a profile or message, or email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>
              . Reports are reviewed as part of RoadWave&apos;s trust and safety
              process — see our{' '}
              <Link
                href="/safety"
                className="text-flame underline-offset-2 hover:underline"
              >
                Safety
              </Link>{' '}
              page for the full guest-side guidance.
            </p>
          </Section>

          <Section title="Changes to these rules">
            <p>
              When we update the Community Rules in a meaningful way,
              we&apos;ll email every account at least 14 days before the
              change takes effect. Continuing to use RoadWave after a change
              is acceptance of the new rules.
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

function Rule({
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
