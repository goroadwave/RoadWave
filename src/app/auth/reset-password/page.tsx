import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Logo } from '@/components/ui/logo'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8 inline-block">
        <Logo className="text-4xl" wordmark />
      </Link>
      <main className="w-full max-w-md rounded-2xl border border-white/5 bg-card p-6 shadow-2xl shadow-black/50">
        <ResetPasswordForm />
      </main>
    </div>
  )
}
