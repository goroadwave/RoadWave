type Props = {
  children: React.ReactNode
  className?: string
}

export function Eyebrow({ children, className }: Props) {
  return (
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.2em] text-flame ${
        className ?? ''
      }`}
    >
      {children}
    </p>
  )
}
