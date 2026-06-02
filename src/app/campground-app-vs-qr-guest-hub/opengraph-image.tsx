import { OG_CONTENT_TYPE, OG_SIZE, renderRoadwaveOg } from '@/lib/og/page-og'

export const alt = 'Campground App vs QR Guest Hub — RoadWave'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image() {
  return renderRoadwaveOg({
    headline: 'Campground App vs QR Guest Hub',
    subtext:
      'When a custom mobile app makes sense — and when a QR-powered guest hub wins.',
  })
}
