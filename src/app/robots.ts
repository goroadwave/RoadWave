import type { MetadataRoute } from 'next'

// Public robots.txt served at https://www.getroadwave.com/robots.txt via
// Next.js's app/robots.ts Metadata API file convention (the same convention
// pattern we use in app/sitemap.ts).
//
// Posture: allow normal crawling everywhere and point search engines at the
// live sitemap. We don't block authed surfaces here — Google already skips
// login-redirect pages naturally, and over-broad Disallow rules can
// accidentally hide legitimate marketing pages we add later. The sitemap
// (src/app/sitemap.ts) is the authoritative list of what we *do* want
// indexed; this robots.txt just doesn't get in the way.

const SITE = 'https://www.getroadwave.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
