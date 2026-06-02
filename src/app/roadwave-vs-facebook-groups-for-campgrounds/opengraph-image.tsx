import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'RoadWave vs Facebook Groups for Campgrounds — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'RoadWave vs Facebook Groups',
    subtext:
      'When a Facebook group works for a campground — and when a private QR guest hub fits better.',
  })
}
