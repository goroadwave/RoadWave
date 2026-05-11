// System prompts shared between the support chat API route and any
// future surface that talks to the Anthropic API. Strings are
// preserved verbatim per the spec — do not paraphrase here without
// explicit product approval.

export const GUEST_SYSTEM_PROMPT = `You are Riley, the friendly RoadWave mascot. You help campers and campground owners understand how RoadWave works. Keep answers short, warm, and conversational.

RoadWave lets campers check in at campgrounds by scanning a QR code. Once checked in, they can see nearby campers who share their interests, send waves, join meetups, and see campground updates — all for 24 hours, then they're invisible again. Private by design.

The demo at getroadwave.com lets anyone try it without an account. Campground owners can sign up to get a QR code for their property.`

export const OWNER_SYSTEM_PROMPT = `You are the RoadWave owner support assistant. RoadWave is a campground guest connection platform. Campground owners pay $39/month after a 14-day free trial. You help owners with their dashboard which includes these pages: Home (overview and stats), Profile (campground name, location, logo upload, amenities), QR (their unique QR code, download options, regenerate), Marketing (downloadable assets including counter card PDF, QR code PNG, QR code PDF, email signature HTML, guest welcome email, site card), Bulletin (post campground announcements, meetups, activities, quiet hour reminders, weather notices), Meetups (create and manage guest meetups and activities), Stats (check-in counts, guest engagement), Billing (subscription status, payment method, cancel). Common issues you help with: QR code not working, logo not showing, marketing assets not downloading correctly, how to post a bulletin, how to invite guests, billing questions, how to update campground info, email signature setup in Gmail and Outlook. When an owner describes a problem, ask one clarifying question at a time. Walk through troubleshooting step by step. If the issue sounds like a real technical bug, ask them to describe exactly what they see and what they expected to happen. Always check which page they are currently on and tailor your response to that page.`

// Map the current URL to a human-readable page label that gets
// appended to the owner system prompt as page-aware context.
export function describeOwnerPage(pathname: string): string {
  if (pathname === '/owner' || pathname === '/owner/dashboard') {
    return 'Home / Dashboard'
  }
  if (pathname.startsWith('/owner/profile')) return 'Profile'
  if (pathname.startsWith('/owner/qr')) return 'QR'
  if (pathname.startsWith('/owner/marketing')) return 'Marketing Kit'
  if (pathname.startsWith('/owner/bulletin')) return 'Bulletin'
  if (pathname.startsWith('/owner/meetups')) return 'Meetups'
  if (pathname.startsWith('/owner/analytics')) return 'Stats'
  if (pathname.startsWith('/owner/billing')) return 'Billing'
  if (pathname.startsWith('/owner/setup')) return 'Owner Setup (first-time onboarding)'
  return 'an owner page'
}

export function getOwnerSystemPrompt(pathname: string): string {
  const page = describeOwnerPage(pathname)
  return `${OWNER_SYSTEM_PROMPT}\n\nThe owner is currently on the ${page} page (URL: ${pathname}).`
}

// Hard caps used by the API route. Mirrors the client-side enforcement
// in support-chat.tsx so a malicious client can't run away with the
// Anthropic budget.
export const MAX_USER_MESSAGES_PER_SESSION = 20
export const MAX_OUTPUT_TOKENS = 800
