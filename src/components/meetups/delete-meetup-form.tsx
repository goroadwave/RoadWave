'use client'

import { deleteMeetupAction } from '@/app/(app)/meetups/actions'

export function DeleteMeetupForm({ meetupId }: { meetupId: string }) {
  return (
    <form
      action={deleteMeetupAction}
      onSubmit={(e) => {
        if (!window.confirm('Delete this meetup?')) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={meetupId} />
      <button
        type="submit"
        className="text-xs text-mist underline-offset-2 hover:text-red-300 hover:underline"
      >
        Delete
      </button>
    </form>
  )
}
