import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

// RoadWave Demo Center -- the sales/onboarding hub for prospective
// campground owners. Public, no auth required, no DB queries on
// this page (all content is static). Reuses the existing
// interactive Wave demo at /demo (src/pages/demo.jsx) as the
// camper-side experience CTA. Owner + walkthrough subpages ship
// in phases 3 and 4 -- their CTAs render with a "Coming next"
// chip until those land.

export const metadata = {
  title: 'RoadWave Demo Center',
  description:
    'See how RoadWave works for campers and campground owners. Camper QR experience, owner dashboard, office messages, bulletins, meetups, weather alerts, and optional Camper Connections.',
}

export default function DemoCenterPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        {/* Logo returns to the Demo Center hub, not the public landing
            page — demo viewers stay inside the demo unless they tap an
            explicit signup/trial CTA. */}
        <Link href="/demo-center" className="inline-block">
          <Logo className="text-3xl" />
        </Link>

        <div className="mt-10 sm:mt-14 max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-flame font-semibold">
            Demo Center
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-cream">
            See how RoadWave works for campers and campground owners
          </h1>
          <p className="mt-5 text-base sm:text-lg text-mist leading-relaxed">
            Explore the camper QR experience, the campground owner dashboard,
            office messages, bulletins, meetups, weather alerts, and optional
            Camper Connections.
          </p>
        </div>

        {/* Main CTA grid. Camper Demo + Start Trial work today
            (link to the existing interactive demo / signup
            flow). Owner Dashboard + Guided Walkthrough show a
            "Coming next" chip until phases 3 + 4 ship -- the
            destinations exist as stubs (or 404 cleanly) so the
            buttons don't break for early shares. */}
        <div className="mt-10 grid gap-3 sm:grid-cols-2 max-w-2xl">
          <DemoCta
            href="/demo-center/camper"
            title="View Camper Demo"
            subtitle="What guests see after scanning your campground QR code."
            icon="📱"
            primary
          />
          <DemoCta
            href="/demo-center/owner"
            title="View Owner Dashboard Demo"
            subtitle="Bulletins, meetups, office messages, stats."
            icon="🧭"
            primary
          />
          <DemoCta
            href="/demo-center/walkthrough"
            title="Take Guided Walkthrough"
            subtitle="Step-by-step tour of every feature."
            icon="🚶"
            primary
          />
          <DemoCta
            href="/owner/signup"
            title="Start 30-Day Trial"
            subtitle="Set up your campground in minutes."
            icon="🚀"
          />
        </div>

        <p className="mt-6 text-xs text-mist max-w-xl leading-relaxed">
          Demo Mode only — no real guest data, no signup required.
        </p>

        {/* How it works */}
        <div className="mt-14 sm:mt-20 max-w-4xl">
          <p className="text-[11px] uppercase tracking-[0.25em] text-flame font-semibold">
            How RoadWave works
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <InfoCard
              title="Campers"
              body="Scan a campground QR code for Wi-Fi, maps, rules, updates, office messages, and optional Camper Connections."
              icon="📷"
            />
            <InfoCard
              title="Campground owners"
              body="Manage bulletins, meetups, weather notices, office messages, review and rebooking links, and guest communication from the dashboard."
              icon="🏕️"
            />
            <InfoCard
              title="Camper Connections"
              body="Optional and privacy-first. Based on mutual Waves. No exact site numbers. No public group chat."
              icon="👋"
            />
          </div>
        </div>

        {/* Privacy reassurance */}
        <div className="mt-14 max-w-3xl rounded-2xl border border-white/5 bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold text-cream">
            What RoadWave isn’t
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-mist leading-relaxed">
            <li>· Not a public group chat.</li>
            <li>· Not always-on GPS tracking.</li>
            <li>· Not a 911 or emergency dispatch system.</li>
            <li>
              · Owners don’t read private camper-to-camper messages — Camper
              Connections are between campers only.
            </li>
            <li>
              · Exact site numbers are never shared in Camper Connections.
            </li>
          </ul>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
          <Link
            href="/owner/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-flame text-night px-5 py-2.5 text-sm font-semibold shadow-lg shadow-flame/15 hover:bg-amber-400 transition-colors"
          >
            Start your 30-day trial
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/campgrounds"
            className="text-sm text-mist hover:text-cream underline-offset-2 hover:underline"
          >
            Or learn more about RoadWave for campgrounds
          </Link>
        </div>
      </section>
    </main>
  )
}

function DemoCta({
  href,
  title,
  subtitle,
  icon,
  primary,
  comingSoon,
}: {
  href: string
  title: string
  subtitle: string
  icon: string
  primary?: boolean
  comingSoon?: boolean
}) {
  const styleClass = primary
    ? 'border-flame/50 bg-flame/15 hover:bg-flame/20'
    : comingSoon
      ? 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
      : 'border-white/10 bg-card hover:border-flame/40 hover:bg-white/[0.04]'
  return (
    <Link
      href={href}
      className={`group relative flex items-start gap-3 rounded-2xl border p-4 transition-colors ${styleClass}`}
    >
      <span aria-hidden className="text-2xl leading-none shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold text-sm flex items-center gap-2 flex-wrap ${
            primary ? 'text-flame' : 'text-cream'
          }`}
        >
          {title}
          {comingSoon && (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-mist font-medium">
              Coming next
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-mist leading-snug">{subtitle}</p>
      </div>
      <span
        aria-hidden
        className={`shrink-0 self-center ${
          primary ? 'text-flame' : 'text-mist group-hover:text-cream'
        }`}
      >
        →
      </span>
    </Link>
  )
}

function InfoCard({
  title,
  body,
  icon,
}: {
  title: string
  body: string
  icon: string
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-card p-5">
      <span aria-hidden className="text-2xl">
        {icon}
      </span>
      <h3 className="mt-3 font-display text-lg font-extrabold text-cream">
        {title}
      </h3>
      <p className="mt-2 text-sm text-mist leading-relaxed">{body}</p>
    </div>
  )
}
