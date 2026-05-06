import type { SupabaseClient } from '@supabase/supabase-js'

// Single source of truth for "where should this user land after a
// successful sign-in?". Used by every login entry point — /login,
// /owner/login, and the OAuth callback — so an owner can never end up
// on /home and a guest can never end up on /owner/dashboard regardless
// of which page they arrived through.
//
// Routing rules, in order:
//
//   1. profiles.role === 'owner' or 'super_admin'  → /owner/dashboard
//   2. row in campground_admins (any role)         → /owner/dashboard
//      (catches owners whose profiles.role didn't get bumped during
//       provisioning — campground_admins is the actual ownership
//       record set by the Stripe webhook)
//   3. otherwise                                   → fallback (default /home)
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
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'owner' || profile?.role === 'super_admin') {
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
