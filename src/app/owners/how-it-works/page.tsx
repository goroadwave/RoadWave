import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'How RoadWave works at your campground — RoadWave',
  description:
    'Step-by-step walkthrough of the camper experience at a RoadWave campground: scan, check in privately, see updates, connect optionally. Built for campground owners considering a pilot.',
}

// Owner-facing deep-dive on the camper experience. The /owners page
// pitches RoadWave's value props and dashboard surface; this page
// walks through what a guest actually sees, step by step, from QR
// scan to checking in to engagement. Useful when a prospect asks
// "but what do MY guests see?"

const STEPS: {
  num: number
  title: string
  what: string
  privacy: string
}[] = [
  {
    num: 1,
    title: 'A camper pulls in and scans the QR code',
    what: 'You print the QR (8.5×11, 5×7, or 4×6) and post it at your front desk, check-in counter, welcome packet, or activity board. Guests scan with their phone camera — no app store, no download. They land on a private welcome page branded with your campground name and logo.',
    privacy:
      'You see "QR scanned" on your dashboard as an aggregate number. You never see who scanned, what site they\'re on, or any device details.',
  },
  {
    num: 2,
    title: 'The welcome page shows two clear options',
    what: '"Check In to This Campground" — full experience, choose visibility, see other campers, post a wave. "Just See Campground Updates" — read-only, no account, perfect for guests who only want your bulletins and meetup posts.',
    privacy:
      'The read-only path requires zero data from the camper. Even the check-in path collects only what the camper picks themselves.',
  },
  {
    num: 3,
    title: 'Check-in: the camper picks their own visibility',
    what: 'A single-screen form: Visible (open to a wave), Quiet (hidden but can wave first), Invisible (look around only), plus optional interest chips like Coffee, Dog walk, Hiking, Fishing. They tap "Complete Check-In" and they\'re in for 24 hours.',
    privacy:
      'No exact site number is ever captured. No always-on GPS. The camper picks visibility every time they check in, and can change it anywhere from /settings/privacy.',
  },
  {
    num: 4,
    title: "They see your campground's welcome page",
    what: 'Your bulletins ("Coffee meetup tomorrow at 9 AM near the clubhouse"), your meetup posts, the optional "Leave a Google Review" button, the "Book Your Next Stay" button with your promo code, the categorized "Contact the Office" form. Everything they can do is opt-in.',
    privacy:
      'Other campers on the page only see what the camper chose to share — display name, optional interests, optional travel style. No real name, no email, no site number.',
  },
  {
    num: 5,
    title: 'They can find shared-interest campers — or skip it',
    what: 'The "Campers checked in here" tab shows who else is at your campground (Visible mode only). Tap a camper to see their interests and an optional status note. The camper can send a wave. A wave only opens a private hello when the other person also waves back.',
    privacy:
      'No public chat. No private chat until a mutual wave. Quiet and Invisible campers don\'t appear in this list at all. The whole social layer is skippable.',
  },
  {
    num: 6,
    title: 'You post a bulletin or meetup → guests see it instantly',
    what: 'From /owner/bulletin or /owner/meetups, you write a short message (≤280 chars), pick a category, optionally set an expiry. Every checked-in camper sees it on their /home and /meetups in seconds. You can post a pickleball meetup, a weather alert, a coffee hour, a quiet-hours reminder.',
    privacy:
      "You don't see who read your bulletin. The dashboard shows an aggregate \"bulletin views\" count for the week.",
  },
  {
    num: 7,
    title: 'Your dashboard shows engagement, not surveillance',
    what: 'Active check-ins right now. QR scans this week. Review-button clicks. Book-again-button clicks. Contact-office messages. Pulse-check responses ("How\'s your stay?"). Bulletin views. A weekly summary email every Monday.',
    privacy:
      'You never see individual guest names, contact info, or what tab they tapped. You see counts. The only place individual messages show up is your inbox, where guests have intentionally chosen to message you.',
  },
  {
    num: 8,
    title: "Check-in expires after 24 hours",
    what: 'No always-on visibility. When the 24 hours are up, the camper drops off the "campers here" list automatically. If they\'re staying longer, they re-scan or use the Check In tab in the app to extend.',
    privacy:
      'The sliding 24-hour window is the floor on privacy. A camper who left your campground three days ago is invisible to everyone, including you.',
  },
]

const NOT_WHAT_IT_IS: { what: string; why: string }[] = [
  {
    what: 'A public group chat',
    why: 'There is no campground-wide chat thread. The only messages between campers happen privately after both people waved.',
  },
  {
    what: 'A reservation system',
    why: 'RoadWave does not handle booking, payments, or site assignments. It complements Campspot, Newbook, Bonfire, and your spreadsheet — it does not replace them.',
  },
  {
    what: 'A surveillance tool',
    why: 'You see aggregate counts. You never see exact site numbers, real names, contact info, or movement.',
  },
  {
    what: 'A data broker',
    why: 'Guest data is never sold or shared with third parties. Your campground\'s dashboard data stays with your campground.',
  },
  {
    what: 'A required guest app',
    why: 'No app store. No download. Web-only. The QR opens a page in the guest\'s default browser.',
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between gap-4">
        <Link href="/" className="inline-block shrink-0">
          <Logo className="text-2xl" />
        </Link>
        <nav>
          <ul className="flex items-center gap-4 sm:gap-6 text-sm">
            <li>
              <Link
                href="/owners"
                className="text-mist hover:text-cream transition-colors"
              >
                Owners
              </Link>
            </li>
            <li>
              <Link
                href="/demo"
                className="text-mist hover:text-cream transition-colors"
              >
                Demo
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="text-mist hover:text-cream transition-colors"
              >
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="px-4 pt-10 pb-12 sm:pt-16 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center space-y-5">
            <Eyebrow>For campground owners</Eyebrow>
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
              How RoadWave works at your campground.
            </h1>
            <p className="text-mist text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              Eight steps, start to finish — from a guest scanning your QR
              at the front desk to your weekly engagement summary landing
              in your inbox. Every step is opt-in, privacy-first, and
              skippable.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-cream px-6 py-3 font-semibold shadow-lg shadow-forest/25 hover:bg-forest/90 transition-colors"
              >
                Start My Campground Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                See the live demo
              </Link>
            </div>
          </div>
        </section>

        {/* 8 steps */}
        <section className="px-4 py-12 border-t border-white/5">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="text-center space-y-2 mb-4">
              <Eyebrow>The full flow</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                Start to finish.
              </h2>
            </div>
            <ol className="space-y-5">
              {STEPS.map((s) => (
                <li
                  key={s.num}
                  className="rounded-2xl border border-flame/30 bg-card p-5 sm:p-6 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-flame text-night font-display text-base font-extrabold"
                    >
                      {s.num}
                    </span>
                    <h3 className="font-display text-xl font-extrabold text-cream leading-snug pt-0.5">
                      {s.title}
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base text-cream/90 leading-relaxed">
                    {s.what}
                  </p>
                  <p className="text-sm text-mist leading-relaxed border-l-2 border-leaf/40 pl-3">
                    <span className="font-semibold text-leaf">
                      Privacy ·{' '}
                    </span>
                    {s.privacy}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What RoadWave is NOT */}
        <section className="px-4 py-14 border-t border-white/5 bg-flame/[0.03]">
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="text-center space-y-2 mb-2">
              <Eyebrow>Just as important</Eyebrow>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
                What RoadWave is <em className="font-display not-italic text-flame">not</em>.
              </h2>
              <p className="text-mist text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                If you've used a guest-engagement product before that
                turned into surveillance, public-chat moderation, or yet
                another front-desk system, here&apos;s what RoadWave
                refuses to be.
              </p>
            </div>
            <ul className="space-y-3">
              {NOT_WHAT_IT_IS.map((item) => (
                <li
                  key={item.what}
                  className="rounded-xl border border-white/5 bg-card p-4 sm:p-5"
                >
                  <p className="font-semibold text-cream mb-1">
                    <span aria-hidden className="text-flame mr-1.5">
                      ✗
                    </span>
                    {item.what}
                  </p>
                  <p className="text-sm text-mist leading-relaxed pl-5">
                    {item.why}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 py-16 border-t border-flame/30 bg-flame/[0.06]">
          <div className="mx-auto max-w-xl text-center space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream">
              See it on your campground.
            </h2>
            <p className="text-mist text-base sm:text-lg leading-relaxed">
              Sign up in two minutes. Print the QR. Post it at your front
              desk. Watch your first check-in come through within an hour
              of a guest scanning it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href="/owners/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-cream px-6 py-3 font-semibold shadow-lg shadow-forest/25 hover:bg-forest/90 transition-colors"
              >
                Start My Campground Pilot
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-flame/40 bg-flame/[0.06] text-cream px-6 py-3 font-semibold hover:bg-flame/15 hover:border-flame/60 transition-colors"
              >
                See the live demo
              </Link>
            </div>
            <p className="text-[11px] text-mist/70 leading-snug pt-2">
              Questions? Email{' '}
              <a
                href="mailto:hello@getroadwave.com"
                className="text-flame underline-offset-2 hover:underline"
              >
                hello@getroadwave.com
              </a>{' '}
              — a real human reads every message.
            </p>
          </div>
        </section>
      </main>
    </>
  )
}
