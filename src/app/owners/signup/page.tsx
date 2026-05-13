import { permanentRedirect } from 'next/navigation'

// /owners/signup is a guess-the-URL alternative to the canonical
// /owners/start (the Stripe-gated owner-intake funnel). Reported as a
// 404 by a real prospect typing it directly. Permanent redirect — the
// canonical path is and remains /owners/start.
//
// /owner/signup (singular) is the older email+password owner signup
// flow that still lives under src/app/owner/signup/ and is reached
// from the owner-login form. Both /owner/signup and /owners/start
// remain valid entry points today; this file just closes the
// "missing plural form" 404 gap that prospects hit when they extend
// the /owners/* prefix pattern from /owners/start + /owners/how-it-works
// + /owners/success.

export default function OwnersSignupRedirect(): never {
  permanentRedirect('/owners/start')
}
