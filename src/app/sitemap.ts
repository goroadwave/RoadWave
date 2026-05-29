import type { MetadataRoute } from 'next'

// Sitemap for public, indexable marketing + legal pages. We deliberately
// exclude:
//   - auth routes (/login, /signup, /verify, /forgot-password,
//     /auth/*, /owner/login, /consent, /goodbye, /suspended)
//   - the camper (app)/* surfaces and the owner (authed) dashboard
//     (login-gated, not indexable)
//   - /admin/*
//   - redirect stubs (/start, /campgrounds, /past-waves, /nearby,
//     /owner/signup, /owners/signup, /settings/delete-account,
//     /campground/[slug]/updates)
//   - API routes
//   - dynamic guest surfaces that need a campground slug (the QR hub
//     /campground/[slug] is per-park and shouldn't be crawled
//     site-wide — owners share their own QR/URL directly)
//
// Add new public marketing routes here as we create them.

const SITE = 'https://www.getroadwave.com'

type Entry = {
  path: string
  priority: number
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
}

const ENTRIES: Entry[] = [
  // Top-level
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },

  // Owner marketing funnel
  { path: '/owners', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/owners/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/owners/start', priority: 0.9, changeFrequency: 'monthly' },

  // SEO comparison pages
  { path: '/app-my-community-alternative', priority: 0.8, changeFrequency: 'monthly' },

  // Demo
  { path: '/demo-center', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/demo-center/camper', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo-center/owner', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo-center/walkthrough', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/demo', priority: 0.7, changeFrequency: 'monthly' },

  // About / contact
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },

  // Safety + community
  { path: '/safety', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/safety-protocol', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/community-rules', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/campground-safety', priority: 0.5, changeFrequency: 'yearly' },

  // Legal
  { path: '/privacy', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/campground-partner-terms', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/law-enforcement', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/data-breach-policy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/account-deletion', priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return ENTRIES.map((e) => ({
    url: `${SITE}${e.path}`,
    lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }))
}
