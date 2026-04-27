export const TRAVEL_STYLES = [
  { slug: 'full_timer', label: 'Full-timer' },
  { slug: 'weekender', label: 'Weekender' },
  { slug: 'snowbird', label: 'Snowbird' },
  { slug: 'seasonal_guest', label: 'Seasonal guest' },
  { slug: 'camp_host', label: 'Camp host' },
  { slug: 'work_camper', label: 'Work camper' },
  { slug: 'solo_traveler', label: 'Solo traveler' },
  { slug: 'traveling_for_work', label: 'Traveling for work' },
  { slug: 'family_traveler', label: 'Family traveler' },
  { slug: 'prefer_quiet', label: 'Prefer quiet' },
] as const

export type TravelStyleSlug = (typeof TRAVEL_STYLES)[number]['slug']

export const TRAVEL_STYLE_LABEL: Record<string, string> = Object.fromEntries(
  TRAVEL_STYLES.map((t) => [t.slug, t.label]),
)
