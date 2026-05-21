'use server'

import {
  writeOAuthCampgroundContext,
  type OAuthCampgroundContext,
} from '@/lib/auth/oauth-context-cookie'

// Server action invoked by GoogleAuthButton right before the browser
// navigates to Google. Persists the campground slug + intended
// returnTo in an HttpOnly cookie so /auth/callback can recover the
// destination even if the `next` query param is dropped somewhere in
// the Supabase round-trip. See oauth-context-cookie.ts for the why.

export async function recordOAuthCampgroundContextAction(
  ctx: OAuthCampgroundContext,
): Promise<void> {
  await writeOAuthCampgroundContext(ctx)
}
