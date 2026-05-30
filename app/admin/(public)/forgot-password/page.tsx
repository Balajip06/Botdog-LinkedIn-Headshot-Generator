import Link from 'next/link'
import { ForgotPasswordForm } from './ForgotPasswordForm'

type SearchParams = Promise<{ sent?: string; error?: string }>

const ERROR_COPY: Record<string, string> = {
  invalid_email: 'Please enter a valid email.',
  unexpected: 'Something went wrong. Try again.',
}

export default async function AdminForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { sent, error } = await searchParams
  const errorMessage = error ? (ERROR_COPY[error] ?? ERROR_COPY.unexpected) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Reset <span className="text-gradient-hero">password</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email associated with your admin account. We&apos;ll send a reset
          link if a matching account exists.
        </p>
      </header>

      {sent && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <p className="font-medium">Check your inbox.</p>
          <p className="opacity-80">
            If an admin account uses this email, a reset link is on its way.
          </p>
        </div>
      )}
      {errorMessage && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <ForgotPasswordForm />

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/admin/login" className="font-medium underline-offset-2 hover:underline">
          Back to admin sign in
        </Link>
      </p>
    </div>
  )
}
