import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const EmailSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
})

async function signInWithEmail(formData: FormData) {
  'use server'
  const parsed = EmailSchema.safeParse({
    email: formData.get('email'),
    next: formData.get('next'),
  })
  if (!parsed.success) redirect('/login?error=invalid_email')

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const next = parsed.data.next ?? '/'
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error) redirect('/login?error=otp_send_failed')
  redirect('/login?sent=1')
}

async function signInWithGoogle(formData: FormData) {
  'use server'
  const next = (formData.get('next') as string) || '/'
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  })
  if (error || !data.url) redirect('/login?error=oauth_failed')
  redirect(data.url)
}

type SearchParams = Promise<{ next?: string; sent?: string; error?: string }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next = '/', sent, error } = await searchParams

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">to continue to Trend Image Generator</p>
      </header>

      {sent && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Check your inbox for the magic link.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Sign in failed. Try again.
        </p>
      )}

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="flex h-11 w-full items-center justify-center rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
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
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="h-11 w-full rounded-md bg-zinc-900 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Send magic link
        </button>
      </form>
    </div>
  )
}
