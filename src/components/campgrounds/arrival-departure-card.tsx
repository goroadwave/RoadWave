// Camper-facing "Arrival & Departure" card. Surfaces the owner-set
// check-in / checkout times and optional notes near the top of the
// campground hub. Mounted on the public QR landing, the signed-in
// hub, the owner preview, and (in a compact variant) the
// campground-aware auth page so a camper sees consistent
// information no matter which surface they're on.
//
// Visibility rules:
//   * Hidden entirely when ALL of check_in_time, check_out_time,
//     and arrival_departure_note are null/empty. An empty card
//     would just be dead vertical space on mobile.
//   * Each row renders independently -- a campground that only
//     publishes a checkout time shows just that row, no orphan
//     "Check-in:" label.
//   * The early / late note fields tie to their respective time:
//     they only render when the time they describe also renders.
//   * `previewMode` (owner preview path) flips the empty-state
//     so the owner sees a soft reminder card prompting them to
//     fill the fields in -- never shown on camper-facing surfaces.

type Props = {
  checkInTime: string | null
  checkOutTime: string | null
  earlyCheckInNote: string | null
  lateCheckOutNote: string | null
  arrivalDepartureNote: string | null
  previewMode?: boolean
}

function nonEmpty(s: string | null): string | null {
  if (!s) return null
  const trimmed = s.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function ArrivalDepartureCard({
  checkInTime,
  checkOutTime,
  earlyCheckInNote,
  lateCheckOutNote,
  arrivalDepartureNote,
  previewMode = false,
}: Props) {
  const inTime = nonEmpty(checkInTime)
  const outTime = nonEmpty(checkOutTime)
  const earlyNote = nonEmpty(earlyCheckInNote)
  const lateNote = nonEmpty(lateCheckOutNote)
  const generalNote = nonEmpty(arrivalDepartureNote)

  const hasAnyTime = !!inTime || !!outTime
  const hasAnything = hasAnyTime || !!generalNote

  if (!hasAnything) {
    if (!previewMode) return null
    // Owner preview: a soft reminder card so they know they can
    // fill in arrival/departure times from their profile page.
    return (
      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
          Arrival &amp; Departure
        </h2>
        <div className="rounded-2xl border border-dashed border-flame/30 bg-flame/[0.04] p-4 sm:p-5">
          <p className="text-sm text-cream leading-relaxed">
            Add your check-in and checkout times so campers see them on the
            QR landing and signed-in hub.
          </p>
          <p className="text-xs text-mist leading-snug pt-2">
            Edit on your Campground profile page.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-flame font-semibold">
        Arrival &amp; Departure
      </h2>
      <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.06] p-4 sm:p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-leaf/40 bg-leaf/15 text-xl"
          >
            🕒
          </span>
          <div className="flex-1 min-w-0 space-y-2.5">
            {inTime && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist/80 font-semibold">
                  Check-in
                </p>
                <p className="text-sm font-semibold text-cream">{inTime}</p>
                {earlyNote && (
                  <p className="text-xs text-mist leading-snug pt-0.5 whitespace-pre-wrap">
                    {earlyNote}
                  </p>
                )}
              </div>
            )}
            {outTime && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-mist/80 font-semibold">
                  Checkout
                </p>
                <p className="text-sm font-semibold text-cream">{outTime}</p>
                {lateNote && (
                  <p className="text-xs text-mist leading-snug pt-0.5 whitespace-pre-wrap">
                    {lateNote}
                  </p>
                )}
              </div>
            )}
            {generalNote && (
              <p className="text-xs text-mist leading-snug whitespace-pre-wrap pt-1 border-t border-white/5 pt-2">
                {generalNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
