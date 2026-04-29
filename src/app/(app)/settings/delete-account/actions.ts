'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendAccountDeletionConfirmEmail } from '@/lib/email/account-deletion'
import { getRequestIp } from '@/lib/utils'

export type DeleteState = { error: string | null }

// Self-serve account deletion. Order:
//   1. Insert compliance log row (no FK to auth.users so it survives).
//   2. Send confirmation email to the address on file (before we lose it).
//   3. Delete the auth.users row. Cascades to:
//        profiles, profile_interests, check_ins, waves, crossed_paths,
//        crossed_paths_messages (via sender_id), legal_acks,
//        reports (reporter_id; reported_user_id is set null), and
//        the user's reports table rows on either side per the FK rules
//        defined in 0018.
//   4. Redirect to /goodbye (signs the user out implicitly via the
//      now-invalid session cookie).
export async function deleteAccountAction(
  _prev: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  // The form requires the user to type DELETE so we don't have a UI bug
  // path that one-clicks a destructive action.
  const confirmText = formData.get('confirm_text')
  if (typeof confirmText !== 'string' || confirmText.trim() !== 'DELETE') {
    return { error: 'Type DELETE to confirm.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Your session expired — sign in again.' }

  const userId = user.id
  const userEmail = user.email ?? null
  const h = await headers()

  const admin = createSupabaseAdminClient()

  // 1) Compliance log first. If this fails we abort — never delete a user
  // without recording the deletion.
  const { error: logError } = await admin.from('account_deletions').insert({
    user_id: userId,
    email_at_deletion: userEmail,
    method: 'self_serve',
    ip_address: getRequestIp(h),
    user_agent: h.get('user-agent'),
  })
  if (logError) {
    console.error('[delete-account] log insert failed:', logError.message)
    return { error: "Couldn't record the deletion. Try again." }
  }

  // 2) Confirmation email — sent BEFORE deletion so we still have the email.
  // Failure here is non-fatal: the deletion is what the user asked for and
  // the compliance row is already in place.
  const deletedAtIso = new Date().toISOString()
  if (userEmail) {
    const sent = await sendAccountDeletionConfirmEmail({
      toEmail: userEmail,
      deletedAt: deletedAtIso,
    })
    if (!sent.ok) {
      console.warn(
        '[delete-account] confirmation email failed (non-fatal):',
        sent.error,
      )
    }
  }

  // 3) Delete the auth.users row. Cascades through public schema FKs.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
  if (deleteError) {
    console.error('[delete-account] deleteUser failed:', deleteError.message)
    return {
      error: `Deletion failed: ${deleteError.message}. Email safety@getroadwave.com — we'll finish it manually.`,
    }
  }

  // 4) Their session cookie is now backed by no user. Send them to the
  // goodbye page; the public app middleware/layout will treat them as
  // signed out from here on.
  redirect('/goodbye')
}
