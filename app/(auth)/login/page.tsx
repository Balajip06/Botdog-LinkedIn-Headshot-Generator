import { LoginForms } from './LoginForms'

type SearchParams = Promise<{ next?: string; sent?: string; error?: string }>

const ERROR_COPY: Record<string, string> = {
  invalid_email: 'Please enter a valid email.',
  bot_check_failed: 'Bot check failed. Refresh and try again.',
  otp_send_failed: 'Could not send the magic link. Try again.',
  oauth_failed: 'Google sign-in failed. Try again.',
  missing_code: 'Sign-in link expired. Try again.',
  exchange_failed: 'Could not finish sign-in. Try again.',
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = '/', sent, error } = await searchParams
  const errorMessage = error ? (ERROR_COPY[error] ?? 'Sign in failed. Try again.') : null

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          to continue to Trend Image Generator
        </p>
      </header>

      {sent && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Check your inbox for the magic link.
        </p>
      )}
      {errorMessage && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </p>
      )}

      <LoginForms next={next} />
    </div>
  )
}
