import { permanentRedirect } from 'next/navigation'

// /owner/signup was an older second owner-signup funnel that duplicated
// the canonical Stripe-gated intake at /owners/start. As of the route
// cleanup it permanently redirects there so RoadWave has exactly one
// "Start Free 30-Day Trial" destination. Every CTA (homepage, /owners,
// /owners/how-it-works, owner-login, the Demo Center, the tour, and
// Riley) now points at /owners/start.
//
// The old form (src/components/owner/owner-signup-form.tsx +
// src/app/owner/signup/actions.ts) is left in the tree but unreferenced;
// it can be removed in a later pass once we're confident nothing else
// depends on it. Same redirect-stub pattern as /start and /campgrounds.
export default function OwnerSignupRedirect(): never {
  permanentRedirect('/owners/start')
}
