import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Campground Digital Welcome Packet — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Digital Welcome Packet for Campgrounds',
    subtext:
      'Wi-Fi, maps, rules, bulletins, and live updates behind one QR code — no app download required.',
  })
}
