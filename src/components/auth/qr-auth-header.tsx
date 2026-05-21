import { PageHeading } from '@/components/ui/page-heading'
import type { QrAuthContext } from '@/lib/auth/qr-auth-context'

// Intent-aware header rendered above the auth form on /login and /signup
// for visitors who arrive from the public campground QR landing page.
//
// Three variants mapped from QrAuthContext.intent:
//
//   * "connections" -- camper tapped the "Join Camper Connections" CTA
//     on the QR landing page (or an older `next=/checkin?token=…` link
//     that hasn't migrated to the explicit ?intent= param yet). The
//     camper is opting in to the social layer (visibility, interests,
//     waves). Copy reflects that.
//
//   * "profile" -- camper tapped the small "Sign in" link in the QR
//     header. They're signing in to manage their own RoadWave
//     profile / settings, not joining the connections layer for this
//     campground. Campground info stays available to them without
//     signing in -- the header explicitly says so.
//
//   * "generic" -- the camper hit /login or /signup directly with no
//     QR context. Plain "Welcome back / Sign in" framing, no
//     campground-specific surface area.
//
// The campground name (when present) is woven into the eyebrow and
// helper text so the camper can confirm they're being routed back to
// the right place after auth. When no campground context is available
// (no slug, no token), the connections / profile variants fall back
// to non-campground-specific phrasing.
//
// IMPORTANT: this component must NEVER mention "checking in",
// "check-in screen", or "finish checking in". Those phrases are
// retired -- the QR landing page already gives the camper map,
// Wi-Fi, rules, updates, and office messages without an account, and
// signing in is now positioned as optional.

const HELPER_CLS =
  'rounded-xl border border-flame/25 bg-flame/[0.05] px-4 py-3 text-sm text-cream/90 leading-relaxed'

const RETURN_HINT_CLS =
  'text-center text-[11px] text-mist/80 leading-snug pt-1'

type Props = {
  ctx: QrAuthContext
  // Variant-specific defaults so /login and /signup can render the
  // SAME card while still putting the right verb in the headline
  // ("Sign in" vs "Create your account").
  mode: 'login' | 'signup'
}

export function QrAuthHeader({ ctx, mode }: Props) {
  if (ctx.intent === 'connections') {
    return <ConnectionsHeader ctx={ctx} mode={mode} />
  }
  if (ctx.intent === 'profile') {
    return <ProfileHeader ctx={ctx} mode={mode} />
  }
  return <GenericHeader mode={mode} />
}

function ConnectionsHeader({ ctx, mode }: Props) {
  const name = ctx.campground?.name ?? null
  const eyebrow = name
    ? `Camper Connections at ${name}`
    : 'Camper Connections'
  const title =
    mode === 'login'
      ? 'Sign in to join Camper Connections'
      : 'Create your RoadWave profile'
  const subtitle =
    mode === 'signup'
      ? 'One quick account, then you can connect.'
      : undefined

  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        compact
      />
      <p className={HELPER_CLS}>
        Create or access your free RoadWave profile to find nearby
        campers with shared interests, control your visibility, and
        wave privately.{' '}
        <strong className="text-cream">
          Campground info stays available without signing in.
        </strong>
      </p>
      {name && (
        <p className={RETURN_HINT_CLS}>
          You&apos;ll return to{' '}
          <span className="text-cream font-medium">{name}</span> after
          signing in.
        </p>
      )}
    </div>
  )
}

function ProfileHeader({ ctx, mode }: Props) {
  const name = ctx.campground?.name ?? null
  const title =
    mode === 'login'
      ? 'Sign in to your RoadWave profile'
      : 'Create your RoadWave profile'

  return (
    <div className="space-y-4">
      <PageHeading eyebrow="RoadWave Profile" title={title} compact />
      <p className={HELPER_CLS}>
        Use your profile for optional Camper Connections, shared
        interests, visibility controls, and private waves.{' '}
        <strong className="text-cream">
          Campground info is still available without signing in.
        </strong>
      </p>
      {name && (
        <p className={RETURN_HINT_CLS}>
          You&apos;ll return to{' '}
          <span className="text-cream font-medium">{name}</span> after
          signing in.
        </p>
      )}
    </div>
  )
}

function GenericHeader({ mode }: { mode: 'login' | 'signup' }) {
  if (mode === 'login') {
    return (
      <PageHeading
        eyebrow="Welcome back"
        title="Sign in"
        subtitle="Pick up where you parked."
        compact
      />
    )
  }
  return (
    <div className="space-y-4">
      <PageHeading
        eyebrow="Welcome to RoadWave"
        title="Create your account"
        subtitle="Connections without the surveillance."
        compact
      />
      <p className={HELPER_CLS}>
        RoadWave is privacy-first. We do not require exact site
        numbers. You control visibility. RoadWave is 18+ only.
      </p>
    </div>
  )
}
