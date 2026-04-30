'use client'

import { useTransition } from 'react'

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
  const [pending, startTransition] = useTransition()
  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.currentTarget.value as T
        startTransition(async () => {
          await onChange(next)
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
  )
}
