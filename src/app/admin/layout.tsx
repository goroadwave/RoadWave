import { requireAdmin } from '@/lib/admin/guard'
import { AdminShell } from '@/components/admin/admin-shell'

// CRITICAL: keep this layout dynamic. Without `force-dynamic`,
// Next.js can prerender the /admin index page (which only calls
// redirect() and reads no cookies) as a static edge redirect,
// completely skipping this layout and therefore requireAdmin.
// That manifested as /admin → 307 → /login with no admin/guard
// log line appearing, because the guard never ran.
export const dynamic = 'force-dynamic'

// Server-side gate for every /admin route. Anonymous + non-admin
// callers are redirected to /login — no admin nav, no admin URL,
// no data is rendered.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  return <AdminShell>{children}</AdminShell>
}
