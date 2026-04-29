import type { Metadata } from 'next'
import DemoPage from '@/pages/demo'
import { AgeGate } from '@/components/ui/age-gate'

// Format a slug like "oak-hollow-rv-resort" into "Oak Hollow Rv Resort".
// Common acronyms get uppercased so "rv" → "RV", "kc" → "KC", etc.
const ACRONYMS = new Set(['rv', 'kc', 'nyc', 'usa', 'la', 'sf', 'pdx'])

function formatSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => {
      if (ACRONYMS.has(word.toLowerCase())) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campground: string }>
}): Promise<Metadata> {
  const { campground } = await params
  const name = formatSlug(campground)
  return {
    title: `${name} · RoadWave Demo`,
    description: `A privacy-first campground connection demo, personalized for ${name}.`,
  }
}

export default async function CampgroundDemoPage({
  params,
}: {
  params: Promise<{ campground: string }>
}) {
  const { campground } = await params
  const name = formatSlug(campground)

  return (
    <AgeGate>
      <div className="bg-flame text-night text-center py-2 text-xs font-semibold tracking-[0.15em] uppercase">
        Powered by RoadWave <span aria-hidden>👋</span>
      </div>
      <DemoPage campgroundName={name} />
    </AgeGate>
  )
}
