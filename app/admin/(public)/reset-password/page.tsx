import { ResetPasswordForm } from './ResetPasswordForm'

type SearchParams = Promise<{ error?: string }>

const ERROR_COPY: Record<string, string> = {
  password_too_short: 'Password must be at least 8 characters.',
  mismatch: 'Passwords do not match.',
  update_failed: 'Could not update password. The reset link may have expired — request a new one.',
  unexpected: 'Could not update password. Try again.',
}

export default async function AdminResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_COPY[error] ?? ERROR_COPY.unexpected) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Set a new <span className="text-gradient-hero">password</span>
        </h1>
        <p className="text-muted-foreground text-sm">Pick something at least 8 characters long.</p>
      </header>

      {errorMessage && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <ResetPasswordForm />
    </div>
  )
}
