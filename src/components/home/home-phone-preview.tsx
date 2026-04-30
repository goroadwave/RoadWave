// Static decorative phone-style mockup for the homepage hero. Matches
// the brand dark-navy + amber palette without pulling any real data —
// the campground name, count, status, and interests are hardcoded per
// the homepage spec.

const INTERESTS = ['walking', 'cards', 'pickleball', 'campfire']

export function HomePhonePreview() {
  return (
    <div
      role="img"
      aria-label="Sample RoadWave check-in screen showing 12 campers checked in at Riverbend RV Park"
      className="mx-auto w-full max-w-[280px] sm:max-w-[320px]"
    >
      <div
        className="relative rounded-[2.5rem] border-[10px] border-black bg-night shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7),0_15px_30px_-8px_rgba(245,158,11,0.12)] overflow-hidden"
        style={{ aspectRatio: '9 / 19.5' }}
      >
        {/* Notch */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-b-2xl z-20"
        />
        {/* Screen */}
        <div className="absolute inset-0 px-3 pt-7 pb-3 overflow-hidden">
          <div className="rounded-[1.5rem] bg-night h-full flex flex-col">
            {/* Brand strip */}
            <div className="bg-flame text-night text-center py-1 text-[9px] font-semibold tracking-[0.15em] uppercase rounded-t-[1.4rem]">
              Powered by RoadWave 👋
            </div>
            {/* Campground header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2.5">
              <div
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-flame/30 bg-flame/10 font-display text-sm font-extrabold text-flame"
              >
                R
              </div>
              <div className="min-w-0">
                <p className="font-display text-sm font-extrabold text-cream truncate">
                  Riverbend RV Park
                </p>
                <p className="text-[10px] text-mist">Asheville, NC</p>
              </div>
            </div>

            {/* Stats + status */}
            <div className="flex-1 px-4 py-4 space-y-3 overflow-hidden">
              <div className="rounded-xl border border-flame/30 bg-flame/[0.06] p-3 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.18em] text-flame">
                  Checked in today
                </p>
                <p className="font-display text-2xl font-extrabold text-cream leading-none">
                  12 <span className="text-sm font-semibold text-mist">campers</span>
                </p>
              </div>

              <div className="rounded-xl border border-white/5 bg-card p-3 space-y-1">
                <p className="text-[9px] uppercase tracking-[0.18em] text-mist">
                  Visible as
                </p>
                <p className="text-xs text-cream leading-snug">
                  Open to friendly hellos
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-mist">
                  Nearby interests
                </p>
                <ul className="flex flex-wrap gap-1">
                  {INTERESTS.map((i) => (
                    <li
                      key={i}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-cream"
                    >
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Wave button (decorative — non-interactive) */}
            <div className="px-4 pb-4">
              <div
                aria-hidden
                className="w-full text-center rounded-lg bg-flame text-night px-3 py-2 text-xs font-semibold shadow-md shadow-flame/15"
              >
                Wave 👋
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
