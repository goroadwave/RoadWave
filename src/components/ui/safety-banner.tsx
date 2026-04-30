// Single-line, muted safety reminder shown at the top of social-feature
// screens (Nearby, Waves, Crossed Paths) and at the top of the demo
// preview shell. Server component — pure presentation, no state.

export function SafetyBanner() {
  return (
    <p
      role="note"
      className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-center text-[11px] text-mist/80 leading-snug"
    >
      Meet in public areas · Trust your instincts · Report concerns to{' '}
      <a
        href="mailto:safety@getroadwave.com"
        className="text-flame underline-offset-2 hover:underline"
      >
        safety@getroadwave.com
      </a>
    </p>
  )
}
