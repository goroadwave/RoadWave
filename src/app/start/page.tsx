import { permanentRedirect } from 'next/navigation'

// /start is the legacy owner-pilot marketing page (Founding Pilot
// pricing + benefits list). After the Phase 3 owner-start flow
// cleanup it permanently redirects to /owners/start — the short,
// action-focused intake form. Bookmarked /start links, old ad
// destinations, and email-signature URLs keep working without
// serving a duplicate sales page that's already covered by /owners
// (the explanation page).
//
// Same pattern as src/app/campgrounds/page.tsx → /owners.
export default function StartRedirect() {
  permanentRedirect('/owners/start')
}
