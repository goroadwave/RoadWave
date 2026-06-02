import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'CampersAPP Alternative for RV Parks and Campgrounds — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'CampersAPP Alternative',
    subtext:
      'A QR-powered guest hub for campgrounds and RV parks. No app download required for camper info.',
  })
}
