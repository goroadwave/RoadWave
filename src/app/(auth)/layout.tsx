import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-4xl" />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/50">
        {children}
      </main>
      <p className="mt-6 max-w-md text-center text-xs text-mist">
        Privacy-first campground connections. We never share your location with other
        campers — only your check-in to a campground.
      </p>
    </div>
  )
}
