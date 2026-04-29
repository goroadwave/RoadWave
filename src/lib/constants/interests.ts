export const INTERESTS = [
  { slug: 'coffee', label: 'Coffee', emoji: '☕' },
  { slug: 'campfire', label: 'Campfire', emoji: '🔥' },
  { slug: 'dogs', label: 'Dogs', emoji: '🐕' },
  { slug: 'cats', label: 'Cats', emoji: '🐱' },
  { slug: 'hiking', label: 'Hiking', emoji: '🥾' },
  { slug: 'kayaking', label: 'Kayaking', emoji: '🛶' },
  { slug: 'paddle_boarding', label: 'Paddle boarding', emoji: '🏄' },
  { slug: 'boating', label: 'Boating', emoji: '⛵' },
  { slug: 'ebikes', label: 'E-bikes', emoji: '⚡' },
  { slug: 'atv_utv', label: 'ATV/UTV', emoji: '🏍️' },
  { slug: 'sports', label: 'Sports', emoji: '🏆' },
  { slug: 'cards', label: 'Cards', emoji: '🃏' },
  { slug: 'live_music', label: 'Live music', emoji: '🎵' },
] as const

export type InterestSlug = (typeof INTERESTS)[number]['slug']

export const INTEREST_EMOJI: Record<string, string> = Object.fromEntries(
  INTERESTS.map((i) => [i.slug, i.emoji]),
)

export const INTEREST_LABEL: Record<string, string> = Object.fromEntries(
  INTERESTS.map((i) => [i.slug, i.label]),
)

export const TERMS_VERSION = '2026-04-27'
export const PRIVACY_VERSION = '2026-04-27'
export const PARTNER_TERMS_VERSION = '2026-04-29'
