import Link from 'next/link'
import { Eyebrow } from '@/components/ui/eyebrow'
import { OwnerMessageBulkArchive } from '@/components/owner/owner-message-bulk-archive'
import { OwnerMessageCopyNumber } from '@/components/owner/owner-message-copy-number'
import { OwnerMessageReplyForm } from '@/components/owner/owner-message-reply-form'
import { OwnerMessageSoundToggle } from '@/components/owner/owner-message-sound-toggle'
import { OwnerMessageStatusButtons } from '@/components/owner/owner-message-status-buttons'
import { OwnerMessagesAutoRefresh } from '@/components/owner/owner-messages-auto-refresh'
import { PageHeading } from '@/components/ui/page-heading'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadOwnerCampground } from '../_helpers'

// Owner-side inbox for guest-submitted messages: structured Contact the
// Office submissions + Pulse "Something needs attention" follow-ups.
// Backed by the owner_messages_for_campground SECURITY DEFINER RPC,
// which checks campground_admins membership server-side.

// Category label map — mirrors the email alert helper so the inbox
// row and the email subject use the same words. Covers both the
// current 9-category dropdown AND the legacy slugs the API still
// accepts (so older messages still render with the right label).
const CATEGORY_LABEL: Record<string, string> = {
  // Current dropdown set:
  wifi: 'Wi-Fi issue',
  maintenance: 'Maintenance issue',
  noise: 'Noise concern',
  bathroom_laundry: 'Bathroom / laundry issue',
  late_checkout: 'Late checkout question',
  general_question: 'General question',
  compliment: 'Compliment',
  suggestion: 'Suggestion',
  safety_concern: 'Safety concern',
  // Backward-compat:
  laundry: 'Laundry',
  propane: 'Propane',
  quiet_hours: 'Quiet hours / noise concern',
  local_recommendations: 'Local recommendations',
  activities: 'Activities',
}

const PREFERRED_METHOD_LABEL: Record<string, string> = {
  email: 'Prefers email',
  phone: 'Prefers call',
  text: 'Prefers text',
  no_reply: 'No reply needed',
}

type MessageStatus = 'new' | 'read' | 'resolved' | 'archived'

type ThreadReply = {
  id: string
  sender_type: 'owner' | 'guest'
  body: string
  created_at: string
}

type MessageRow = {
  id: string
  source: 'contact_form' | 'pulse_needs_attention'
  category: string | null
  body: string
  guest_contact: string | null
  status: MessageStatus
  submitted_at: string
  // Structured guest info (mig 0052). NULL on legacy + pulse rows.
  site_number: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  preferred_contact_method: string | null
  read_at: string | null
  resolved_at: string | null
  // Archive support (mig 0054). NULL on rows that have never been
  // archived. Stamped on transition to 'archived'; cleared on un-archive.
  archived_at: string | null
}

// Filter tab values. ?filter=<value> in the URL drives the active
// tab; default is "active" which shows new/read/resolved (everything
// except archived).
type FilterKey = 'active' | 'new' | 'resolved' | 'archived' | 'all'

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'new', label: 'New' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
]

function parseFilter(raw: string | undefined): FilterKey {
  if (raw === 'new' || raw === 'resolved' || raw === 'archived' || raw === 'all') {
    return raw
  }
  return 'active'
}

function rowMatches(filter: FilterKey, status: MessageStatus): boolean {
  if (filter === 'all') return true
  // "Active" means rows that still need attention -- new + read.
  // Resolved rows live under the Resolved tab (the owner has already
  // handled them); archived rows live under Archived. This keeps the
  // default inbox tight and stops resolved cards from stacking up.
  if (filter === 'active') return status === 'new' || status === 'read'
  return status === filter
}

export default async function OwnerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: filterRaw } = await searchParams
  const filter = parseFilter(filterRaw)
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

  const allMessages = (data ?? []) as MessageRow[]
  const visibleMessages = allMessages.filter((m) =>
    rowMatches(filter, m.status),
  )

  // Fetch the reply threads for the visible messages in parallel.
  // owner_message_thread RPC (mig 0055) is gated by campground_admins
  // membership server-side, so even if the message id is wrong we get
  // an empty thread back rather than a security error. Pulse-source
  // rows never have replies (no guest_reply_token, so the guest reply
  // path can never reach them), but we still call the RPC uniformly.
  const threadEntries = await Promise.all(
    visibleMessages.map(async (m) => {
      const { data: replies } = await supabase
        .rpc('owner_message_thread', { _message_id: m.id })
        .returns<ThreadReply[]>()
      return [m.id, (replies ?? []) as ThreadReply[]] as const
    }),
  )
  const threadsByMessage = new Map<string, ThreadReply[]>(threadEntries)

  // Tab counts come from the full result set so the tabs always show
  // the same numbers regardless of which tab is active. The Active
  // count counts rows still requiring attention (new + read) -- it
  // matches what the Active tab actually renders, not just "everything
  // not archived."
  const tabCounts: Record<FilterKey, number> = {
    active: allMessages.filter(
      (m) => m.status === 'new' || m.status === 'read',
    ).length,
    new: allMessages.filter((m) => m.status === 'new').length,
    resolved: allMessages.filter((m) => m.status === 'resolved').length,
    archived: allMessages.filter((m) => m.status === 'archived').length,
    all: allMessages.length,
  }

  // Bulk-archive button targets every resolved row, not just those
  // visible in the current filter — that matches user expectation:
  // "Archive Resolved" should drain every resolved message regardless
  // of which tab is open.
  const resolvedCount = tabCounts.resolved

  return (
    <div className="space-y-6">
      {/* Server-rendered inbox auto-refresh. The page fetches
          messages + per-message reply threads on every render, so
          a periodic router.refresh() is enough to surface new
          camper replies without realtime. Visibility-gated; no
          network calls while the tab is hidden. Renders nothing. */}
      <OwnerMessagesAutoRefresh />
      <PageHeading
        eyebrow="Guest messages"
        title="Inbox"
        subtitle="Pulse-check alerts and Contact the Office submissions from your welcome page."
      />

      {/* Local-only "play sound on new message" toggle. Off by default;
          persisted in the owner's browser localStorage. Mounted at the
          top of the inbox so it's discoverable when the owner is here
          actively reading messages. */}
      <div className="flex flex-wrap items-center gap-3">
        <OwnerMessageSoundToggle />
        <OwnerMessageBulkArchive resolvedCount={resolvedCount} />
      </div>

      {/* Filter tabs. Default tab is Active (new + read + resolved),
          which mirrors the historical inbox view -- archived rows
          never appear here unless the owner explicitly switches tabs.
          The active tab is encoded in the URL so the owner can
          bookmark / share a specific view. */}
      <nav>
        <ul className="flex flex-wrap gap-1.5 text-xs">
          {FILTER_TABS.map((tab) => {
            const active = filter === tab.key
            const count = tabCounts[tab.key]
            const href =
              tab.key === 'active'
                ? '/owner/messages'
                : `/owner/messages?filter=${tab.key}`
            return (
              <li key={tab.key}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? 'inline-flex items-center gap-1.5 rounded-full bg-flame/15 border border-flame/40 text-flame px-3 py-1 font-semibold'
                      : 'inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 text-mist px-3 py-1 hover:bg-white/10 hover:text-cream transition-colors'
                  }
                >
                  {tab.label}
                  <span
                    className={
                      active
                        ? 'rounded-full bg-flame/20 text-flame px-1.5 text-[10px] tabular-nums'
                        : 'rounded-full bg-white/10 text-mist px-1.5 text-[10px] tabular-nums'
                    }
                  >
                    {count}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error.message}
        </p>
      )}

      {visibleMessages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-8 text-center space-y-2">
          <Eyebrow>
            {filter === 'archived'
              ? 'No archived messages'
              : filter === 'all'
                ? 'No messages yet'
                : filter === 'active'
                  ? 'All caught up'
                  : filter === 'resolved'
                    ? 'No resolved messages'
                    : 'No new messages'}
          </Eyebrow>
          <p className="text-sm text-mist max-w-md mx-auto leading-snug">
            {filter === 'archived'
              ? 'Resolved messages you archive will show up here. You can unarchive or permanently delete them from this view.'
              : filter === 'active'
                ? 'Nothing in the active inbox needs attention right now. Resolved messages live under the Resolved tab.'
                : filter === 'resolved'
                  ? 'When you mark a message Resolved it lands here. From this tab you can archive it or move it back to active.'
                  : 'When a guest taps "Something needs attention" on the Pulse Check, or sends a Contact the Office message from your welcome page, it\'ll land here.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visibleMessages.map((m) => (
            <MessageCard
              key={m.id}
              message={m}
              thread={threadsByMessage.get(m.id) ?? []}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function MessageCard({
  message,
  thread,
}: {
  message: MessageRow
  thread: ThreadReply[]
}) {
  const isPulse = message.source === 'pulse_needs_attention'
  // Safety-concern messages get a red badge + red-tinted card border
  // so the owner sees them above ordinary "Wi-Fi is slow"-grade
  // requests. Pairs with the [Safety] subject prefix on the email
  // alert. Pulse "needs attention" keeps its flame styling -- it's
  // already a high-signal event but isn't strictly a safety thing.
  const isSafety = message.category === 'safety_concern'
  const label = isPulse
    ? 'Needs attention'
    : (message.category && CATEGORY_LABEL[message.category]) || 'Message'

  // Status pill styling. "new" → amber chip (matches the unread badge
  // in the nav). "read" → muted neutral. "resolved" → leaf green.
  // "archived" → muted slate (visually quieter than active states so
  // the All view doesn't look noisy).
  const statusChipClass =
    message.status === 'new'
      ? 'rounded-full bg-flame/15 text-flame border border-flame/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]'
      : message.status === 'resolved'
        ? 'rounded-full bg-leaf/15 text-leaf border border-leaf/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]'
        : message.status === 'archived'
          ? 'rounded-full bg-white/[0.03] text-mist/80 border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]'
          : 'rounded-full bg-white/5 text-mist border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]'

  // Guest display name: "Smith, Jane" / "Smith" / "—"
  const nameParts = [message.last_name, message.first_name].filter(
    (s): s is string => !!s && s.trim().length > 0,
  )
  const displayName =
    nameParts.length === 2
      ? `${nameParts[0]}, ${nameParts[1]}`
      : nameParts[0] ?? ''

  return (
    <li
      className={
        isSafety
          ? 'rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-4 space-y-3'
          : isPulse
            ? 'rounded-2xl border border-flame/30 bg-flame/[0.04] p-4 space-y-3'
            : 'rounded-2xl border border-white/5 bg-card p-4 space-y-3'
      }
    >
      {/* Top row: category label, time, status pill. */}
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span
          className={
            isSafety
              ? 'rounded-full bg-red-500/20 text-red-200 px-2 py-0.5 font-semibold uppercase tracking-[0.12em]'
              : isPulse
                ? 'rounded-full bg-flame/15 text-flame px-2 py-0.5 font-semibold uppercase tracking-[0.12em]'
                : 'rounded-full bg-white/5 text-cream px-2 py-0.5 font-semibold uppercase tracking-[0.12em]'
          }
        >
          {isSafety ? '⚠ Safety · ' : ''}
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={statusChipClass}>{message.status}</span>
          <span className="text-mist tabular-nums">
            {/* Archived rows show "Archived 3d ago" instead of the
                original submission timestamp so the owner sees when
                they archived it (useful in the Archived view). All
                other states show submission time. */}
            {message.status === 'archived' && message.archived_at
              ? `Archived ${formatSubmittedAt(message.archived_at)}`
              : formatSubmittedAt(message.submitted_at)}
          </span>
        </div>
      </div>

      {/* Guest info row. Hidden entirely for pulse + legacy rows where
          site_number is null -- they have no structured info to show. */}
      {message.site_number && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
          <span className="inline-flex items-center gap-1 text-cream">
            <span className="text-mist">Site</span>
            <span className="font-semibold">{message.site_number}</span>
          </span>
          {displayName && (
            <span className="inline-flex items-center gap-1 text-cream">
              <span className="text-mist">·</span>
              <span className="font-semibold">{displayName}</span>
            </span>
          )}
          {message.preferred_contact_method &&
            PREFERRED_METHOD_LABEL[message.preferred_contact_method] && (
              <span className="inline-flex items-center gap-1 text-mist">
                <span>·</span>
                <span>
                  {PREFERRED_METHOD_LABEL[message.preferred_contact_method]}
                </span>
              </span>
            )}
        </div>
      )}

      <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
        {message.body}
      </p>

      {/* Phone row -- formatted number + Copy Number button. Desktop
          office workflow: read off the screen and dial from the office
          phone. The tel: deep-link inside the component is gated to
          touch / coarse-pointer devices so a click on a laptop never
          launches a useless phone-app handler. */}
      {message.phone && <OwnerMessageCopyNumber phone={message.phone} />}

      {/* Email + SMS secondary actions. Email stays a desktop-friendly
          mailto: (every office machine has a default mail client).
          The Text button is still useful from a mobile device; we keep
          it for parity with what the form offered the guest. */}
      {(message.email || message.phone) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {message.email && (
            <a
              href={`mailto:${message.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-flame/40 bg-flame/10 text-flame px-3 py-1.5 text-xs font-semibold hover:bg-flame/15 transition-colors"
            >
              <span aria-hidden>📧</span>
              Reply by Email
            </a>
          )}
          {message.phone && (
            <a
              href={`sms:${message.phone.replace(/[^0-9+]/g, '')}`}
              className="mobile-tel-only items-center gap-1.5 rounded-lg border border-leaf/40 bg-leaf/10 text-leaf px-3 py-1.5 text-xs font-semibold hover:bg-leaf/15 transition-colors"
            >
              <span aria-hidden>💬</span>
              Text (mobile)
            </a>
          )}
        </div>
      )}

      {/* Legacy free-form guest_contact line. Only renders when no
          structured pointers exist -- otherwise it duplicates the
          info already shown above the response buttons. */}
      {!message.email &&
        !message.phone &&
        message.guest_contact &&
        message.guest_contact.trim().length > 0 && (
          <p className="text-[11px] text-mist">
            <span className="text-cream font-semibold">Contact:</span>{' '}
            {message.guest_contact}
          </p>
        )}
      {!message.site_number && !message.guest_contact && (
        <p className="text-[11px] text-mist/70 italic">
          Guest did not leave a contact pointer.
        </p>
      )}

      {/* Thread of replies (owner + guest), ordered oldest -> newest. */}
      {thread.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-mist font-semibold">
            Thread
          </p>
          <ul className="space-y-2">
            {thread.map((r) => (
              <ThreadBubble key={r.id} reply={r} />
            ))}
          </ul>
        </div>
      )}

      {/* Owner reply form. Only attached to contact_form rows -- pulse
          rows have no guest_reply_token, so the guest reply page can't
          resolve them anyway. Showing the Reply button on a pulse row
          would let the owner write a reply nobody can ever read. */}
      {message.source === 'contact_form' && (
        <OwnerMessageReplyForm
          messageId={message.id}
          canEmailGuest={!!message.email}
        />
      )}

      {/* Status-mutation buttons. Server actions; revalidatePath fires
          after each so the page re-fetches with the new status. */}
      <OwnerMessageStatusButtons
        messageId={message.id}
        status={message.status}
      />
    </li>
  )
}

function ThreadBubble({ reply }: { reply: ThreadReply }) {
  const isOwner = reply.sender_type === 'owner'
  return (
    <li
      className={
        isOwner
          ? 'rounded-xl border border-flame/30 bg-flame/[0.06] p-3'
          : 'rounded-xl border border-leaf/30 bg-leaf/[0.05] p-3'
      }
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span
          className={
            isOwner
              ? 'text-[10px] font-semibold uppercase tracking-[0.18em] text-flame'
              : 'text-[10px] font-semibold uppercase tracking-[0.18em] text-leaf'
          }
        >
          {isOwner ? 'Office' : 'Guest'}
        </span>
        <span className="text-[10px] text-mist tabular-nums">
          {formatSubmittedAt(reply.created_at)}
        </span>
      </div>
      <p className="text-sm text-cream leading-relaxed whitespace-pre-wrap">
        {reply.body}
      </p>
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
