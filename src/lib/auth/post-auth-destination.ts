import type { SupabaseClient } from '@supabase/supabase-js'

// Single source of truth for "where should this user land after a
// successful sign-in?". Used by every login entry point — /login,
// /owner/login, and the OAuth callback — so an owner can never end up
// on /home and a guest can never end up on /owner/dashboard regardless
// of which page they arrived through.
//
// Routing rules, in order:
//
//   1. profiles.is_admin = true                    → /owner/dashboard
//      (super-admins who aren't tied to a specific campground still
//       work out of the owner dashboard surface; the is_admin flag is
//       the same one the (app) layout uses to render the Admin link)
//   2. profiles.role in ('super_admin', 'admin', 'owner')
//                                                  → /owner/dashboard
//      (the enum today only defines guest/owner/super_admin, but we
//       also accept the literal 'admin' so a future enum extension
//       doesn't silently break this routing)
//   3. row in campground_admins (any role)         → /owner/dashboard
//      (catches owners whose profiles.role didn't get bumped during
//       provisioning — campground_admins is the actual ownership
//       record set by the Stripe webhook)
//   4. otherwise                                   → fallback (default /home)
//
// Reads use the caller's RLS-aware SupabaseClient — campground_admins
// has a self-select policy so an owner can read their own row, and
// profiles is readable by every authenticated user for their own id.

export type PostAuthDestination = '/owner/dashboard' | '/home' | string

export async function getPostAuthDestination(
  supabase: SupabaseClient,
  userId: string,
  fallback: PostAuthDestination = '/home',
): Promise<PostAuthDestination> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.is_admin) return '/owner/dashboard'

  const role = profile?.role
  if (role === 'super_admin' || role === 'admin' || role === 'owner') {
    return '/owner/dashboard'
  }

  const { data: adminLink } = await supabase
    .from('campground_admins')
    .select('campground_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (adminLink) return '/owner/dashboard'

  return fallback
}
