import { requireAdmin } from '@/lib/admin/guard'
import { AdminShell } from '@/components/admin/admin-shell'

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
