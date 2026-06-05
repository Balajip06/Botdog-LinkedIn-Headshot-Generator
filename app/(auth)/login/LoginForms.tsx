'use client'

import { Mail } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { GradientButton } from '@/components/brand/GradientButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signInWithMagicLink } from './actions'

interface LoginFormsProps {
  next: string
}

export function LoginForms({ next }: LoginFormsProps) {
  const [token, setToken] = useState('')
  const [tosAccepted, setTosAccepted] = useState(false)
  const turnstileGated = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const ready = (turnstileGated ? token.length > 0 : true) && tosAccepted

  // Server action also re-validates `tos_accepted=='1'` — this gate is the
  // UX layer; the action is the security layer. Both must agree.
  const tosFieldValue = tosAccepted ? '1' : '0'

  return (
    <div className="flex flex-col gap-5">
      <label
        htmlFor="tos_accepted_checkbox"
        className="border-border/60 bg-card/40 text-muted-foreground flex items-start gap-3 rounded-2xl border p-3 text-xs"
      >
        <input
          id="tos_accepted_checkbox"
          type="checkbox"
          checked={tosAccepted}
          onChange={(e) => setTosAccepted(e.target.checked)}
          className="border-border bg-background mt-0.5 size-4 shrink-0 rounded border"
          aria-required="true"
        />
        <span>
          I agree to the{' '}
          <Link
            href="/terms"
            target="_blank"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            terms of service
          </Link>{' '}
          and{' '}
          <Link
            href="/privacy"
            target="_blank"
            className="text-foreground font-medium underline-offset-2 hover:underline"
          >
            privacy policy
          </Link>
          . Check this box to enable sign-in below.
        </span>
      </label>

      {turnstileGated && (
        <div className="flex flex-col items-center gap-2">
          <TurnstileWidget onToken={setToken} />
          {!token && <p className="text-muted-foreground text-xs">Waiting for bot-check…</p>}
        </div>
      )}

      <form action={signInWithMagicLink} className="flex flex-col gap-3">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="turnstile_token" value={token} />
        <input type="hidden" name="tos_accepted" value={tosFieldValue} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            className="h-12 rounded-xl"
            autoComplete="email"
          />
        </div>
        <GradientButton type="submit" size="lg" disabled={!ready} className="w-full">
          <Mail className="size-4" />
          Send magic link
        </GradientButton>
      </form>
    </div>
  )
}
