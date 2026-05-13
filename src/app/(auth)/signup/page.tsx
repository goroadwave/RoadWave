import { redirect } from 'next/navigation'
import { SignupCard } from '@/components/auth/signup-card'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// When a camper lands on /signup from a campground QR scan, the
// `next` query param looks like /checkin?token=<uuid>. Parse the
// token out so we can render campground-specific copy ("Check in to
// {name}") instead of the default early-launch waitlist framing.
//
// Strict regex: `next` must literally be /checkin?token=<uuid> with
// no extra path segments. Anything else falls through to generic copy.
const CHECKIN_NEXT_RE = /^\/checkin\?token=([0-9a-f-]{36})$/i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type CheckInTarget = {
  campgroundName: string
  campgroundSlug: string
  city: string | null
  region: string | null
}

async function resolveCheckInTarget(
  next: string | undefined,
): Promise<CheckInTarget | null> {
  if (!next) return null
  // searchParams come URL-decoded already in Next 15+, but if a
  // caller passes a literally-encoded value, decode defensively.
  const decoded = next.startsWith('%2F') ? decodeURIComponent(next) : next
  const match = decoded.match(CHECKIN_NEXT_RE)
  if (!match) return null
  const token = match[1]
  if (!UUID_RE.test(token)) return null

  // campground_qr_tokens is RLS-locked to service-role only (migration
  // 0002). The signup page is public (anon visitors only — authed ones
  // are bounced below), so we use the admin client for this lookup.
  // Tokens are stable per campground and act as the camper's entry key;
  // surfacing the campground name from a known-valid token is the
  // intended use case.
  try {
    const admin = createSupabaseAdminClient()
    const { data: tokenRow } = await admin
      .from('campground_qr_tokens')
      .select('campground_id')
      .eq('token', token)
      .maybeSingle<{ campground_id: string }>()
    if (!tokenRow?.campground_id) return null
    const { data: cg } = await admin
      .from('campgrounds')
      .select('name, slug, city, region, is_active')
      .eq('id', tokenRow.campground_id)
      .maybeSingle<{
        name: string
        slug: string
        city: string | null
        region: string | null
        is_active: boolean
      }>()
    if (!cg || !cg.is_active) return null
    return {
      campgroundName: cg.name,
      campgroundSlug: cg.slug,
      city: cg.city,
      region: cg.region,
    }
  } catch {
    return null
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  const sp = (await searchParams) ?? {}
  const target = await resolveCheckInTarget(sp.next)

  if (target) {
    const locationLine = [target.city, target.region]
      .filter(Boolean)
      .join(', ')
    return (
      <div className="space-y-6">
        <PageHeading
          eyebrow={`Check in to ${target.campgroundName}`}
          title="One quick account, then you're checked in."
          subtitle={
            locationLine
              ? `${target.campgroundName} · ${locationLine}`
              : target.campgroundName
          }
          compact
        />
        <p className="rounded-xl border border-leaf/30 bg-leaf/[0.06] px-4 py-3 text-sm text-cream/90 leading-relaxed">
          You&apos;re moments away from checking in to{' '}
          <strong className="text-cream">{target.campgroundName}</strong>.
          Create a quick RoadWave account and you&apos;ll go straight to the
          check-in screen where you pick your visibility (Visible / Quiet /
          Invisible / Updates Only) and your interests.
        </p>
        <div className="rounded-xl border border-flame/20 bg-flame/[0.04] px-4 py-4 space-y-1.5">
          <h2 className="font-display text-base font-semibold text-cream">
            What checking in actually does
          </h2>
          <ul className="text-sm text-cream/85 leading-relaxed list-disc pl-5 space-y-1">
            <li>
              Puts you on this campground&apos;s welcome page for 24 hours —
              you see bulletins, meetups, and (if you want) other campers
              checked in here.
            </li>
            <li>
              No exact site number. No always-on GPS. You control visibility,
              and can switch it any time.
            </li>
            <li>
              Waves only open a private hello when both people wave back.
              Skip anything you don&apos;t want.
            </li>
          </ul>
        </div>
        <SignupCard />
        <p className="text-center text-[11px] text-mist/80 leading-snug">
          Already have an account?{' '}
          <a
            href={`/login?next=${encodeURIComponent(sp.next ?? '/')}`}
            className="text-flame underline-offset-2 hover:underline"
          >
            Sign in
          </a>{' '}
          to finish checking in.
        </p>
      </div>
    )
  }

  // Default: generic public signup. Wording reflects "join the network",
  // not "check in to a specific campground."
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Welcome to RoadWave"
        title="Create your account"
        subtitle="Connections without the surveillance."
        compact
      />
      <p className="rounded-xl border border-flame/25 bg-flame/[0.05] px-4 py-3 text-sm text-cream/90 leading-relaxed">
        RoadWave is privacy-first. We do not require exact site numbers.
        Your check-in is temporary. You control visibility. RoadWave is 18+
        only.
      </p>
      <div className="rounded-xl border border-flame/20 bg-flame/[0.04] px-4 py-4 space-y-1.5">
        <h2 className="font-display text-base font-semibold text-cream">
          What happens after you join?
        </h2>
        <p className="text-sm text-cream/85 leading-relaxed">
          You&apos;ll be part of the early RoadWave launch list. As campground
          pages go live, you&apos;ll be able to check in privately, choose your
          visibility, find shared interests, and open a private hello only
          after a mutual wave.
        </p>
      </div>
      <SignupCard />
    </div>
  )
}
