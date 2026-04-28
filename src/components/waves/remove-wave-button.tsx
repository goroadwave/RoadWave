import { removeWaveAction } from '@/app/(app)/waves/actions'

export function RemoveWaveButton({ waveId }: { waveId: string }) {
  return (
    <form action={removeWaveAction}>
      <input type="hidden" name="id" value={waveId} />
      <button
        type="submit"
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-mist hover:text-cream hover:border-white/20 transition-colors"
      >
        Remove wave
      </button>
    </form>
  )
}
