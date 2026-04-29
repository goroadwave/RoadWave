import Link from 'next/link'
import type { Metadata } from 'next'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Logo } from '@/components/ui/logo'

export const metadata: Metadata = {
  title: 'Contact RoadWave',
  description:
    "Questions about RoadWave? We'd love to hear from you.",
}

export default function ContactPage() {
  return (
    <>
      <header className="px-4 py-5 flex items-center justify-between">
        <Link href="/" className="inline-block">
          <Logo className="text-2xl" />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-mist hover:text-cream underline-offset-2 hover:underline"
        >
          ← Home
        </Link>
      </header>

      <main className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center space-y-5">
          <Eyebrow>Contact</Eyebrow>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-cream leading-[1.05]">
            Get in touch
          </h1>
          <p className="font-serif italic text-flame text-lg sm:text-xl leading-snug">
            Questions about RoadWave? We&apos;d love to hear from you.
          </p>
          <div className="pt-3">
            <a
              href="mailto:hello@getroadwave.com"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-flame text-night px-6 py-3 font-semibold shadow-lg shadow-flame/20 hover:bg-amber-400 transition-colors"
            >
              Email us <span aria-hidden>→</span>
            </a>
          </div>
          <p className="text-xs text-mist pt-2">
            Or reach us directly at{' '}
            <a
              href="mailto:hello@getroadwave.com"
              className="text-flame underline-offset-2 hover:underline"
            >
              hello@getroadwave.com
            </a>
          </p>
        </div>
      </main>
    </>
  )
}
