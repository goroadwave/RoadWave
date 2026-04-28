type LogoProps = {
  className?: string
}

// One canonical RoadWave logo, used everywhere on the site:
//   "Road" (cream)  "Wave" (flame)  👋
//
// All inline, single line, no exceptions. Wrap prevention is enforced two
// ways: the outer span is whitespace-nowrap so the browser cannot break
// between any of the children, and the "Wave"+emoji pair lives inside a
// nested whitespace-nowrap span as belt-and-suspenders against any parent
// that resets the rule. Sizing is em-relative so the wave matches the
// letters at every breakpoint — from text-base to text-6xl.
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={`inline-block whitespace-nowrap font-display font-extrabold tracking-[-0.02em] leading-none text-cream ${className ?? 'text-3xl'}`}
      aria-label="RoadWave"
    >
      <span className="text-cream">Road</span>
      <span className="whitespace-nowrap text-flame">
        Wave
        <span className="wave-emoji select-none text-flame" aria-hidden>
          👋
        </span>
      </span>
    </span>
  )
}
