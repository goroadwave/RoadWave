import { deleteBulletinAction } from '@/app/owner/(authed)/bulletin/actions'

export function DeleteBulletinButton({ bulletinId }: { bulletinId: string }) {
  return (
    <form action={deleteBulletinAction}>
      <input type="hidden" name="id" value={bulletinId} />
      <button
        type="submit"
        className="text-xs font-semibold text-red-300 hover:text-red-200 underline-offset-2 hover:underline"
      >
        Delete bulletin
      </button>
    </form>
  )
}
