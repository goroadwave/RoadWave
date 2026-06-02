import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Campground Guest Communication Software — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Guest Communication Software for RV Parks',
    subtext:
      'Bulletins, office messages, weather notices, and meetups — all behind one QR code.',
  })
}
