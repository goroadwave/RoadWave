type LogoProps = {
  className?: string
}

// Renders "RoadWa👋e" with "Road" in cream and "Wa[👋]e" in flame.
// The hand emoji is tightened against the surrounding letters and waves
// continuously via the .wave-emoji rule defined in globals.css.
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={`font-display font-extrabold tracking-[-0.02em] leading-none ${className ?? 'text-3xl'}`}
      aria-label="RoadWave"
    >
      <span className="text-cream">Road</span>
      <span className="text-flame">Wa</span>
      <span className="wave-emoji select-none" aria-hidden>
        👋
      </span>
      <span className="text-flame">e</span>
    </span>
  )
}
