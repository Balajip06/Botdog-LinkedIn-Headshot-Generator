'use client'

import { useState } from 'react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { signInWithEmail, signInWithGoogle } from './actions'

interface LoginFormsProps {
  next: string
}

export function LoginForms({ next }: LoginFormsProps) {
  const [token, setToken] = useState('')
  const turnstileGated = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const ready = turnstileGated ? token.length > 0 : true

  return (
    <div className="space-y-6">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="turnstile_token" value={token} />
        <button
          type="submit"
          disabled={!ready}
          className="flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
        >
          Continue with Google
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-50 px-2 text-zinc-500 dark:bg-black">or</span>
        </div>
      </div>

      <form action={signInWithEmail} className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="turnstile_token" value={token} />
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={!ready}
          className="h-11 w-full rounded-md bg-zinc-900 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Send magic link
        </button>
      </form>

      {turnstileGated && (
        <div className="flex flex-col items-center gap-2">
          <TurnstileWidget onToken={setToken} />
          {!token && (
            <p className="text-xs text-zinc-500">Waiting for bot-check…</p>
          )}
        </div>
      )}
    </div>
  )
}
