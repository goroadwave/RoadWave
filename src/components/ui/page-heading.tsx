import { Eyebrow } from './eyebrow'

type Props = {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  compact?: boolean
}

export function PageHeading({ eyebrow, title, subtitle, compact }: Props) {
  return (
    <header className="space-y-2">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1
        className={
          compact
            ? 'font-display text-2xl font-extrabold tracking-tight text-cream leading-[1.1]'
            : 'font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-cream leading-[1.05]'
        }
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={
            compact
              ? 'font-serif italic text-flame text-base sm:text-lg leading-snug'
              : 'font-serif italic text-flame text-lg sm:text-xl leading-snug'
          }
        >
          {subtitle}
        </p>
      )}
    </header>
  )
}
