import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Server-side admin gate. Use at the top of every admin page,
 * server action, and API route. Returns the resolved user + supabase
 * client so callers don't need to refetch.
 *
 * Non-admin behavior:
 *   - Anonymous → redirect to /login
 *   - Signed in but is_admin=false → redirect to /login
 *
 * The redirect destination is intentionally the same in both cases so
 * the dashboard's existence isn't disclosed by the response shape.
 *
 * The is_admin lookup uses the SERVICE ROLE client to bypass RLS — the
 * user-context Supabase client has occasionally returned null for newly
 * added columns due to RLS policy interaction. This is a defensive
 * read-only check; we don't write anything from here.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.log('[admin/guard] no user on request — redirecting to /login')
    redirect('/login')
  }

  // Use the service-role client so the lookup can't be blocked by an RLS
  // policy regression on profiles. Reads only — no writes.
  const admin = createSupabaseAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  console.log(
    `[admin/guard] uid=${user.id} is_admin=${profile?.is_admin ?? 'NULL'} error=${error?.message ?? 'none'}`,
  )

  if (!profile?.is_admin) redirect('/login')

  return { user, supabase }
}
