'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props<T extends string> = {
  value: T
  options: readonly T[]
  onChange: (next: T) => Promise<{ ok: boolean; error: string | null }>
  labels?: Partial<Record<T, string>>
}

export function StatusSelect<T extends string>({
  value,
  options,
  onChange,
  labels,
}: Props<T>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <select
        defaultValue={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.currentTarget.value as T
          setError(null)
          startTransition(async () => {
            const result = await onChange(next)
            if (!result.ok) {
              setError(result.error ?? 'Could not update.')
              return
            }
            // Pull the fresh server-rendered tree so the row's status
            // pill (and any other UI bound to the same data) flips to
            // reflect the new state. Without this, revalidatePath in
            // the action only invalidates the server cache and the
            // client view stays stale until a navigation happens.
            router.refresh()
          })
        }}
        className="rounded-md border border-white/10 bg-night text-cream text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-flame disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-night">
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
      {error && (
        <span className="rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300 max-w-[12rem] text-right">
          {error}
        </span>
      )}
    </span>
  )
}
