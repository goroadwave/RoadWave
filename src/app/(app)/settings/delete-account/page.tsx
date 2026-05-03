import { redirect } from 'next/navigation'

// Old account-deletion URL. The page now lives at /account/delete
// for discoverability; this route keeps existing in-flight bookmarks
// and email links working by 308-redirecting.

export default function LegacyDeleteAccountPage() {
  redirect('/account/delete')
}
