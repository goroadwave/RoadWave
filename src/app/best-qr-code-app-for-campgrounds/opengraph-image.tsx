import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Best QR Code App for Campgrounds — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Best QR Code App for Campgrounds',
    subtext:
      'Wi-Fi, maps, updates, office messages, reviews, rebooking, and camper connections — no app download required.',
  })
}
