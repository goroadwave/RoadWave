// Single source of truth for the campground amenities the owner profile
// form lets you tick. Used by:
//   - src/components/owner/owner-profile-form.tsx (the checkbox grid +
//     the "Other Amenities — Add Your Own" section)
//   - src/app/campground/[slug]/page.tsx (guest welcome page render)
//   - src/components/owner/marketing-kit.tsx (counter card PDF render)
//
// Stored values in campgrounds.amenities are the LABELS below — not
// internal slugs. Custom amenities owners type into the "Add Your Own"
// section save into the same text[] alongside the standard ones; the
// renderer distinguishes them via membership in STANDARD_AMENITY_LABELS.

export type AmenityGroup = {
  /** Group title shown above the checkboxes. */
  title: string
  amenities: string[]
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    title: 'Hookups & Site Types',
    amenities: [
      'Full Hookups',
      'Water/Electric',
      '50 Amp Service',
      'Pull-Through Sites',
      'Tent Sites',
    ],
  },
  {
    title: 'Sports & Activities',
    amenities: [
      'Playground',
      'Walking Trails',
      'Bike Trails',
      'Pickleball Courts',
      'Tennis Courts',
      'Basketball Courts',
      'Mini Golf',
      'Horseshoes',
      'Volleyball Court',
      'Bocce Ball',
      'Fishing',
    ],
  },
  {
    title: 'Water & Recreation',
    amenities: [
      'Pool',
      'Heated Pool',
      'Hot Tub',
      'Splash Pad',
      'Lake Access',
      'Boat Launch',
      'Kayak / Canoe Rentals',
      'Fishing Pond',
    ],
  },
  {
    title: 'Facilities',
    amenities: [
      'WiFi',
      'Restrooms',
      'Showers',
      'Laundry',
      'Clubhouse',
      'Fitness Center',
      'Game Room',
      'Camp Store',
      'Store',
      'Propane Refill',
      'Firewood',
      'Ice Available',
      'Cable TV Hookup',
      'Gated Access',
      'Dump Station',
      'Recycling',
      'Trash Station',
      'EV Charging',
    ],
  },
  {
    title: 'Family & Pets',
    amenities: ['Dog-Friendly', 'Dog Park', 'Pet Wash Station', 'Nature Trails'],
  },
  {
    title: 'Community',
    amenities: [
      'Fire Pits',
      'Picnic Areas',
      'Planned Activities',
      'Food Truck Visits',
      'Golf Cart Rentals',
      'Shuttle',
    ],
  },
]

export const STANDARD_AMENITY_LABELS: readonly string[] = AMENITY_GROUPS.flatMap(
  (g) => g.amenities,
)

const standardSet = new Set(STANDARD_AMENITY_LABELS)

/** Returns true when `value` is one of the brand-curated standard
 *  amenity labels (vs an owner-typed custom amenity). The renderers
 *  use this to pick between solid and dashed tag styles. */
export function isStandardAmenity(value: string): boolean {
  return standardSet.has(value)
}

/** Owner-input cap for custom amenities (per spec). */
export const MAX_CUSTOM_AMENITIES = 20
/** Max characters per custom amenity, to keep tags presentable. */
export const MAX_CUSTOM_AMENITY_CHARS = 50

/** Split a saved campgrounds.amenities array into [standard, custom]
 *  preserving order. Trims + drops empties on the way through. */
export function splitAmenities(
  raw: string[] | null | undefined,
): { standard: string[]; custom: string[] } {
  const cleaned = (raw ?? [])
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0)
  const standard: string[] = []
  const custom: string[] = []
  for (const s of cleaned) {
    if (standardSet.has(s)) standard.push(s)
    else custom.push(s)
  }
  return { standard, custom }
}
