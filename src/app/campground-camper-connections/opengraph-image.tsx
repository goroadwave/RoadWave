import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Help Campers Connect Safely at Your Campground — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Help Campers Connect Safely',
    subtext:
      'Mutual Waves. No exact site numbers shown. Per-camper visibility controls. Opt-in.',
  })
}
