import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/guard'

// force-dynamic + an explicit requireAdmin() call so Next can never
// prerender this page as a static redirect — that optimization was
// bypassing the layout's guard entirely.
export const dynamic = 'force-dynamic'

export default async function AdminIndex() {
  await requireAdmin()
  redirect('/admin/activity')
}
