// Client-safe copy + reason types for wave eligibility. Lives in its
// own file (separate from eligibility.ts) so client components like
// WaveButton can import the copy table without pulling in the server
// Supabase clients that the eligibility-compute functions depend on.

export type WaveEligibilityReason =
  | 'ok'
  | 'same_user'
  | 'sender_missing_profile'
  | 'sender_invisible'
  | 'recipient_missing_profile'
  | 'recipient_not_visible'
  | 'no_shared_active_checkin'
  | 'already_waved'
  | 'already_matched'
  | 'recipient_blocked'
  | 'wrong_id'
  | 'rls_denied'

export type WaveEligibility = {
  ok: boolean
  reason: WaveEligibilityReason
}

export const WAVE_REASON_COPY: Record<WaveEligibilityReason, string> = {
  ok: '',
  same_user: 'This is your own card.',
  sender_missing_profile:
    'Finish setting up your profile to wave at other campers.',
  sender_invisible:
    "You're in Invisible / Updates Only mode — switch to Visible or Quiet to send a wave.",
  recipient_missing_profile:
    "This camper hasn't finished setting up their profile yet.",
  recipient_not_visible: 'This camper is not accepting waves right now.',
  no_shared_active_checkin:
    "This camper's check-in just expired. Refresh to update the list.",
  already_waved: 'Wave already sent — check your Lantern for updates.',
  already_matched: 'You already matched — open the conversation to say hi.',
  recipient_blocked: 'This camper is no longer reachable.',
  wrong_id: 'Could not identify this camper. Refresh the list.',
  rls_denied:
    "You can't wave at this camper right now — refresh the list and try again.",
}
