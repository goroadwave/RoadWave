import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/login')

  return { user, supabase }
}
