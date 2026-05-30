import Link from 'next/link'
import { AdminLoginForm } from './AdminLoginForm'

type SearchParams = Promise<{ next?: string; sent?: string; error?: string }>

const ERROR_COPY: Record<string, string> = {
  invalid_credentials: 'Email or password is wrong.',
  password_too_short: 'Password must be at least 8 characters.',
  email_not_confirmed: 'Email not yet confirmed.',
  not_admin: 'This account does not have admin access.',
  unexpected: 'Sign in failed. Try again.',
}

const SUCCESS_COPY: Record<string, string> = {
  password_updated: 'Password updated. Sign in with your new password.',
  '1': 'Reset link sent — check your inbox.',
}

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = '/admin', sent, error } = await searchParams
  const errorMessage = error ? (ERROR_COPY[error] ?? ERROR_COPY.unexpected) : null
  const successMessage = sent ? (SUCCESS_COPY[sent] ?? null) : null

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Admin <span className="text-gradient-hero">sign in</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Internal access only. Users sign in at{' '}
          <Link href="/login" className="font-medium underline-offset-2 hover:underline">
            /login
          </Link>
          .
        </p>
      </header>

      {successMessage && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <AdminLoginForm next={next} />
    </div>
  )
}
