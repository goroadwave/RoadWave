import { endCriticalNoticeAction } from '@/app/owner/(authed)/bulletin/actions'

// Phase 3c cleanup -- "End critical notice" button. Renders only on
// the /owner/bulletin "Currently posted" card when the active
// bulletin is_critical = true. Submitting calls
// endCriticalNoticeAction which flips is_critical to false on the
// bulletin without deleting it (so the announcement stays visible
// in the camper QR bulletins list, just no longer pinned with the
// red banner). Distinct from the Delete button below it which
// removes the whole bulletin.

export function EndCriticalNoticeButton({ bulletinId }: { bulletinId: string }) {
  return (
    <form action={endCriticalNoticeAction}>
      <input type="hidden" name="id" value={bulletinId} />
      <button
        type="submit"
        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/[0.08] text-red-200 px-3 py-1.5 text-xs font-semibold hover:bg-red-500/15 transition-colors"
      >
        <span aria-hidden>✓</span>
        End critical notice
      </button>
    </form>
  )
}
