import type { Metadata } from 'next'
import Link from 'next/link'
import DemoPage from '@/pages/demo'
import { GuestPreview } from '@/components/campgrounds/demo-preview'
import { AgeGate } from '@/components/ui/age-gate'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// Two paths share this URL:
//   1. Saved interactive demo from /campgrounds wizard — looked up by slug
//      in public.demo_pages. Renders the branded preview shell + tabs and
//      shows an expiry banner.
//   2. Legacy / freeform — any unknown slug falls back to the original
//      "format-slug-as-campground-name" demo page so prior marketing
//      links keep working.

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

type SavedDemo = {
  slug: string
  campground_name: string
  logo_url: string | null
  city: string | null
  region: string | null
  expires_at: string
}

async function loadSavedDemo(slug: string): Promise<SavedDemo | null> {
  // Service-role read — RLS allows anon SELECT on live rows anyway, but
  // using admin keeps the path simple and bypasses any cookie-context
  // edge cases on the marketing route.
  const admin = createSupabaseAdminClient()
  const { data } = await admin
    .from('demo_pages')
    .select('slug, campground_name, logo_url, city, region, expires_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  if (new Date(data.expires_at).getTime() <= Date.now()) return null
  return data as SavedDemo
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campground: string }>
}): Promise<Metadata> {
  const { campground } = await params
  const saved = await loadSavedDemo(campground)
  const name = saved?.campground_name ?? formatSlug(campground)
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
  const saved = await loadSavedDemo(campground)

  if (saved) {
    const expiryLabel = new Date(saved.expires_at).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return (
      <AgeGate>
        <main className="px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-2xl space-y-4">
            <p className="text-center text-[11px] uppercase tracking-[0.2em] text-flame">
              Live preview
            </p>
            <GuestPreview
              campgroundName={saved.campground_name}
              logoUrl={saved.logo_url}
              city={saved.city}
              region={saved.region}
            />
            <p className="text-center text-xs text-mist/70">
              Sample preview — live until {expiryLabel}.{' '}
              <Link
                href="/campgrounds#request-demo"
                className="text-flame underline-offset-2 hover:underline"
              >
                Build your own
              </Link>
              .
            </p>
          </div>
        </main>
      </AgeGate>
    )
  }

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
