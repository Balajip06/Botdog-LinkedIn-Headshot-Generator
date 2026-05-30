'use client'

import { useState } from 'react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitTrend } from './actions'

const MAX_DESCRIPTION = 500

export function SubmitForm() {
  const [token, setToken] = useState('')
  const [description, setDescription] = useState('')
  const hasTurnstileKey =
    typeof process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === 'string' &&
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY.length > 0
  // Without Turnstile configured the widget short-circuits to 'dev' — leave
  // the submit button enabled so dev/preview flows still work.
  const canSubmit = !hasTurnstileKey || token.length > 0

  return (
    <form
      action={submitTrend}
      className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-card p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="trend_name">Trend name</Label>
        <Input
          id="trend_name"
          name="trend_name"
          required
          minLength={2}
          maxLength={200}
          placeholder="e.g. Action figure in a box"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reference_url">Reference URL</Label>
        <Input
          id="reference_url"
          name="reference_url"
          type="url"
          required
          placeholder="https://www.tiktok.com/..."
        />
        <p className="text-xs text-muted-foreground">
          Link to a TikTok, Instagram, or Reddit post that shows the trend.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">What makes this trend work?</Label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          maxLength={MAX_DESCRIPTION}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
          placeholder="Aesthetic, lighting, what people upload, why it pops..."
        />
        <p className="text-xs text-muted-foreground">
          {description.length} / {MAX_DESCRIPTION}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="your_email">Your email (optional)</Label>
        <Input
          id="your_email"
          name="your_email"
          type="email"
          placeholder="you@example.com"
        />
        <p className="text-xs text-muted-foreground">
          In case we want to ping you when the trend ships.
        </p>
      </div>

      <input type="hidden" name="turnstile_token" value={token} />
      <TurnstileWidget onToken={setToken} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="brand-grad brand-glow inline-flex h-12 items-center justify-center rounded-full px-7 text-base font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
      >
        Submit trend
      </button>
    </form>
  )
}
