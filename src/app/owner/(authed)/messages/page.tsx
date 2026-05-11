import { Eyebrow } from '@/components/ui/eyebrow'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'

// Owner-side inbox for guest-submitted messages: structured Contact the
// Office submissions + Pulse "Something needs attention" follow-ups.
// Backed by the owner_messages_for_campground SECURITY DEFINER RPC,
// which checks campground_admins membership server-side.

const CATEGORY_LABEL: Record<string, string> = {
  wifi: 'Wi-Fi',
  laundry: 'Laundry',
  propane: 'Propane',
  late_checkout: 'Late checkout',
  maintenance: 'Maintenance',
  quiet_hours: 'Quiet hours / noise',
  local_recommendations: 'Local recommendations',
  activities: 'Activities',
  general_question: 'General question',
}

type MessageRow = {
  id: string
  source: 'contact_form' | 'pulse_needs_attention'
  category: string | null
  body: string
  guest_contact: string | null
  status: 'new' | 'read' | 'resolved'
  submitted_at: string
}

export default async function OwnerMessagesPage() {
  const { campground } = await loadOwnerCampground()
  if (!campground) {
    return (
      <PageHeading
        eyebrow="Guest messages"
        title="No campground linked"
        subtitle="Refresh, or contact support if this persists."
      />
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .rpc('owner_messages_for_campground', {
      _campground_id: campground.id,
      _limit: 200,
    })
    .returns<MessageRow[]>()

  const messages = (data ?? []) as MessageRow[]

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Guest messages"
        title="Inbox"
        subtitle="Pulse-check alerts and Contact the Office submissions from your welcome page."
      />

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error.message}
        </p>
      )}

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-8 text-center space-y-2">
          <Eyebrow>No messages yet</Eyebrow>
          <p className="text-sm text-mist max-w-md mx-auto leading-snug">
            When a guest taps &ldquo;Something needs attention&rdquo; on the
            Pulse Check, or sends a Contact the Office message from your
            welcome page, it&apos;ll land here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <MessageCard key={m.id} message={m} />
          ))}
        </ul>
      )}
    </div>
  )
}

function MessageCard({ message }: { message: MessageRow }) {
  const isPulse = message.source === 'pulse_needs_attention'
  const label = isPulse
    ? 'Needs attention'
    : (message.category && CATEGORY_LABEL[message.category]) || 'Message'
  const accent = isPulse ? 'flame' : 'leaf'
  return (
    <li
      className={
        accent === 'flame'
          ? 'rounded-2xl border border-flame/30 bg-flame/[0.04] p-4 space-y-2'
          : 'rounded-2xl border border-white/5 bg-card p-4 space-y-2'
      }
    >
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span
          className={
            isPulse
              ? 'rounded-full bg-flame/15 text-flame px-2 py-0.5 font-semibold uppercase tracking-[0.12em]'
              : 'rounded-full bg-white/5 text-cream px-2 py-0.5 font-semibold uppercase tracking-[0.12em]'
          }
        >
          {label}
        </span>
        <span className="text-mist tabular-nums">
          {formatSubmittedAt(message.submitted_at)}
        </span>
      </div>
      <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
        {message.body}
      </p>
      {message.guest_contact ? (
        <p className="text-[11px] text-mist">
          <span className="text-cream font-semibold">Contact:</span>{' '}
          {message.guest_contact}
        </p>
      ) : (
        <p className="text-[11px] text-mist/70 italic">
          Guest did not leave a contact pointer.
        </p>
      )}
    </li>
  )
}

function formatSubmittedAt(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffMs = Date.now() - t
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
