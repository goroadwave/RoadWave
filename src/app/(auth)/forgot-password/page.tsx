import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { PageHeading } from '@/components/ui/page-heading'

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Forgot password?"
        title="Send a reset link."
        subtitle="Enter the email tied to your account."
        compact
      />
      <ForgotPasswordForm />
    </div>
  )
}
