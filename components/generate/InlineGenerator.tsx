'use client'

import { Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { requestMagicLinkInline } from '@/app/(auth)/login/actions'
import { GradientButton } from '@/components/brand/GradientButton'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import { SchemaForm } from '@/components/upload/SchemaForm'
import { Input } from '@/components/ui/input'
import { analytics, EVENTS } from '@/lib/analytics/client'
import { getFingerprintHash } from '@/lib/anon/fingerprint'
import { generateIdempotencyKey } from '@/lib/idempotency'
import { createClient } from '@/lib/supabase/client'
import type { PublicTrend } from '@/lib/trends/repository'
import type { TrendInput } from '@/lib/trends/input-schema'
import type { TrendInputValues } from '@/lib/trends/interpolate'
import { prepareImageForUpload } from '@/lib/utils/image'

interface InlineGeneratorProps {
  trend: Pick<PublicTrend, 'slug' | 'input_schema' | 'model'>
  /** Resolved server-side. null = logged-out (anonymous trial path). */
  userId: string | null
  /** Preselected style `value` from a thumbnail tile or ?style= deep-link. */
  initialStyleValue?: string
  /** Where the magic link lands after the email step (account, w/ ?anon claim). */
  loginNext?: string
  /** MOCK_TRENDS dev mode — short-circuit the whole flow with a fixture image
   *  so the UI states are walkable without a live Gemini/Supabase pipeline. */
  mock?: boolean
}

type Phase =
  | { k: 'idle' }
  | { k: 'generating' }
  | { k: 'result'; imageUrl: string; id: string; anon: boolean }
  | { k: 'error'; message: string }
  | { k: 'email' }
  | { k: 'sent'; email: string }

const SIGNED_URL_TTL_SECONDS = 3600
const POLL_INTERVAL_MS = 2500
const POLL_TIMEOUT_MS = 90_000
const MOCK_RESULT_IMAGE = '/mock/sample-1.svg'
const MOCK_DELAY_MS = 1400

export function InlineGenerator({
  trend,
  userId,
  initialStyleValue,
  loginNext = '/me/creations',
  mock = false,
}: InlineGeneratorProps) {
  const [phase, setPhase] = useState<Phase>({ k: 'idle' })
  const [submitting, setSubmitting] = useState(false)
  const [anonAttemptId, setAnonAttemptId] = useState<string | null>(null)
  const turnstileToken = useRef<string>('')
  // Guards against a second generate firing while one is in flight (ref, not
  // state, so the check is synchronous and free of stale-closure risk).
  const inFlightRef = useRef(false)
  // Cancels whichever async wait (Realtime channel or poll loop) is in flight,
  // so navigating away mid-generation doesn't leak a subscription or keep polling.
  const cleanupRef = useRef<(() => void) | null>(null)
  useEffect(() => () => cleanupRef.current?.(), [])

  // Override the style field's default with the tile/deep-link selection. Keying
  // SchemaForm by the value remounts it so a fresh tile click re-seeds the form.
  const effectiveSchema = useMemo<TrendInput>(() => {
    if (!initialStyleValue) return trend.input_schema
    return {
      ...trend.input_schema,
      fields: trend.input_schema.fields.map((f) =>
        f.type === 'select' && f.name === 'style' ? { ...f, default: initialStyleValue } : f
      ),
    }
  }, [trend.input_schema, initialStyleValue])

  const onAnonGenerate = useCallback(
    async (values: TrendInputValues, files: Record<string, File[]>) => {
      const photo = files.user_photo?.[0]
      if (!photo) throw new Error('Add a photo first')

      const prepared = await prepareImageForUpload(photo)
      const fd = new FormData()
      fd.append('file', prepared.file)
      const upRes = await fetch('/api/anonymous/upload', { method: 'POST', body: fd })
      const up = (await upRes.json()) as { url?: string; error?: string }
      if (!upRes.ok || !up.url) throw new Error(up.error ?? 'Upload failed')

      const fingerprint = await getFingerprintHash()
      const res = await fetch('/api/generate-anonymous', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': generateIdempotencyKey() },
        body: JSON.stringify({
          trend_slug: trend.slug,
          values: { ...values, user_photo: up.url },
          turnstile_token: turnstileToken.current || 'dev',
          fingerprint_hash: fingerprint,
        }),
      })
      const body = (await res.json()) as { anonymous_attempt_id?: string; error?: string }
      if (res.status === 409) {
        // Device already spent its one free trial — push them to sign up.
        toast.message('You already used your free try — sign in for 5 more.')
        setPhase({ k: 'email' })
        return
      }
      if (!res.ok || !body.anonymous_attempt_id) {
        throw new Error(body.error ?? `Generate failed (${res.status})`)
      }

      const id = body.anonymous_attempt_id
      setAnonAttemptId(id)
      const cancelToken = { cancelled: false }
      cleanupRef.current?.() // tear down any prior in-flight wait first
      cleanupRef.current = () => {
        cancelToken.cancelled = true
      }
      const imageUrl = await pollAnonStatus(id, cancelToken)
      setPhase({ k: 'result', imageUrl, id, anon: true })
    },
    [trend.slug]
  )

  const onAuthedGenerate = useCallback(
    async (values: TrendInputValues, files: Record<string, File[]>) => {
      const supabase = createClient()
      const idemKey = generateIdempotencyKey()
      const valuesWithUrls: TrendInputValues = { ...values }

      for (const [fieldName, list] of Object.entries(files)) {
        if (!list?.length) continue
        const urls: string[] = []
        for (let i = 0; i < list.length; i++) {
          const prepared = await prepareImageForUpload(list[i])
          const path = `${userId}/${idemKey}/${fieldName}_${i}.jpg`
          const { error: upErr } = await supabase.storage
            .from('uploads')
            .upload(path, prepared.file, { contentType: 'image/jpeg', upsert: true })
          if (upErr) throw new Error(`upload ${fieldName}[${i}]: ${upErr.message}`)
          const { data: signed, error: signErr } = await supabase.storage
            .from('uploads')
            .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
          if (signErr || !signed?.signedUrl) throw new Error(signErr?.message ?? 'sign failed')
          urls.push(signed.signedUrl)
        }
        valuesWithUrls[fieldName] = urls.length === 1 ? urls[0] : urls
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idemKey },
        body: JSON.stringify({ trend_slug: trend.slug, values: valuesWithUrls }),
      })
      const body = (await res.json()) as { generation_id?: string; error?: string }
      if (res.status === 402) {
        setPhase({ k: 'error', message: 'out-of-credits' })
        return
      }
      if (!res.ok || !body.generation_id) throw new Error(body.error ?? `Generate failed (${res.status})`)

      cleanupRef.current?.() // tear down any prior in-flight wait first
      const wait = waitForGeneration(body.generation_id)
      cleanupRef.current = wait.cancel
      const imageUrl = await wait.promise
      setPhase({ k: 'result', imageUrl, id: body.generation_id, anon: false })
    },
    [trend.slug, userId]
  )

  const handleSubmit = useCallback(
    async (payload: { values: TrendInputValues; files: Record<string, File[]> }) => {
      if (inFlightRef.current) return // ignore double-submits
      inFlightRef.current = true
      setSubmitting(true)
      setPhase({ k: 'generating' })
      analytics.track(EVENTS.GENERATE_CLICKED, {
        trend_slug: trend.slug,
        model: trend.model,
        is_anonymous: !userId,
      })
      try {
        if (mock) {
          // Dev MOCK mode — skip the real pipeline, show a fixture after a beat.
          await sleep(MOCK_DELAY_MS)
          setPhase({ k: 'result', imageUrl: MOCK_RESULT_IMAGE, id: 'demo', anon: !userId })
          return
        }
        if (userId) await onAuthedGenerate(payload.values, payload.files)
        else await onAnonGenerate(payload.values, payload.files)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        if (message === 'cancelled') return // unmount/re-generate — not a real failure
        analytics.track(EVENTS.GENERATE_FAILED, { trend_slug: trend.slug, reason: 'invalid', attempts: 0 })
        setPhase({ k: 'error', message })
      } finally {
        inFlightRef.current = false
        setSubmitting(false)
      }
    },
    [mock, onAnonGenerate, onAuthedGenerate, trend.model, trend.slug, userId]
  )

  // ---- render per phase ----
  let body: React.ReactNode
  if (phase.k === 'generating') {
    body = <GeneratingState />
  } else if (phase.k === 'result') {
    body = (
      <ResultState
        phase={phase}
        mock={mock}
        onGenerateMore={() => {
          if (phase.anon) setPhase({ k: 'email' })
          else setPhase({ k: 'idle' })
        }}
      />
    )
  } else if (phase.k === 'error') {
    body = <ErrorState message={phase.message} onRetry={() => setPhase({ k: 'idle' })} />
  } else if (phase.k === 'email') {
    body = (
      <EmailState
        mock={mock}
        loginNext={anonAttemptId ? `${loginNext}?anon=${anonAttemptId}` : loginNext}
        onSent={(email) => setPhase({ k: 'sent', email })}
      />
    )
  } else if (phase.k === 'sent') {
    body = <SentState email={phase.email} />
  } else {
    body = (
      <>
        {!userId && (
          <TurnstileWidget onToken={(t) => (turnstileToken.current = t)} theme="light" />
        )}
        <SchemaForm
          key={initialStyleValue ?? 'default'}
          schema={effectiveSchema}
          onSubmit={handleSubmit}
          submitting={submitting}
          ctaLabel="Generate"
          square
        />
      </>
    )
  }

  // Cap the square stage so the card height stays contained (≈ the hero text
  // height) instead of filling a wide column. Centered within whatever card holds it.
  return <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-5">{body}</div>
}

interface CancelToken {
  cancelled: boolean
}

// Poll the anon status route until the image is ready (or timeout / cancel).
async function pollAnonStatus(id: string, token: CancelToken): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    if (token.cancelled) throw new Error('cancelled')
    const res = await fetch(`/api/anonymous/${id}/status`, { cache: 'no-store' })
    if (token.cancelled) throw new Error('cancelled') // unmounted/re-generated mid-fetch
    if (res.status === 404) throw new Error('We lost track of that one — please try again.')
    if (!res.ok) continue // transient (429/5xx) — keep polling until deadline
    const body = (await res.json()) as {
      status: string
      output_image_url: string | null
    }
    if (body.status === 'completed' && body.output_image_url) return body.output_image_url
    if (body.status === 'failed' || body.status === 'failed_retryable') {
      throw new Error('The model couldn’t finish this one. Try a different photo.')
    }
  }
  throw new Error('Still working — refresh in a moment to see your headshot.')
}

interface GenerationWait {
  promise: Promise<string>
  cancel: () => void
}

// Subscribe to the authed generation row via Realtime; resolve on completion.
// Returns a `cancel` so the caller can tear the channel down on unmount.
function waitForGeneration(id: string): GenerationWait {
  const supabase = createClient()
  let cleanup = () => {}
  const promise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Still working — check My creations in a moment.'))
    }, POLL_TIMEOUT_MS)

    const channel = supabase
      .channel(`inline-gen-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'generations', filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as { status: string; output_image_url: string | null }
          if (row.status === 'completed' && row.output_image_url) {
            cleanup()
            resolve(row.output_image_url)
          } else if (row.status === 'failed' || row.status === 'failed_retryable') {
            cleanup()
            reject(new Error('The model couldn’t finish this one. Try again.'))
          }
        }
      )
      .subscribe()

    cleanup = () => {
      clearTimeout(timeout)
      supabase.removeChannel(channel)
    }
  })
  return { promise, cancel: () => cleanup() }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function GeneratingState() {
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center">
      <span className="size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      <p className="text-sm font-medium">Creating your headshot…</p>
      <p className="text-muted-foreground text-xs">Usually under 30 seconds. Keeping your real face.</p>
    </div>
  )
}

function ResultState({
  phase,
  mock,
  onGenerateMore,
}: {
  phase: { imageUrl: string; id: string; anon: boolean }
  mock: boolean
  onGenerateMore: () => void
}) {
  const onDownload = useCallback(async () => {
    try {
      const href = mock
        ? phase.imageUrl
        : phase.anon
          ? `/api/anonymous/${phase.id}/download`
          : `/api/download/${phase.id}`
      const res = await fetch(href)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'botdog-headshot.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed — long-press the image to save.')
    }
  }, [mock, phase.anon, phase.id, phase.imageUrl])

  return (
    <div className="flex flex-col gap-5">
      <figure className="border-border/60 shadow-pop relative aspect-square overflow-hidden rounded-2xl border">
        <Image
          src={phase.imageUrl}
          alt="Your generated headshot"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 480px"
          className="object-cover"
        />
      </figure>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="border-border hover:bg-muted flex-1 rounded-full border px-6 py-3 text-sm font-medium transition-colors"
        >
          Download
        </button>
        <GradientButton type="button" size="lg" className="flex-1" onClick={onGenerateMore}>
          Generate more
        </GradientButton>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const outOfCredits = message === 'out-of-credits'
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/30 px-6 text-center">
      <p className="text-sm font-medium">
        {outOfCredits ? 'You’re out of credits for now.' : 'Something went sideways.'}
      </p>
      <p className="text-muted-foreground text-xs">
        {outOfCredits
          ? 'Get the Botdog plan for more headshots, or invite friends to earn credits.'
          : message}
      </p>
      {outOfCredits ? (
        <GradientButton asChild size="lg">
          <Link href="/me/creations#botdog-plan">See the Botdog plan</Link>
        </GradientButton>
      ) : (
        <GradientButton type="button" size="lg" onClick={onRetry}>
          Try again
        </GradientButton>
      )}
    </div>
  )
}

const EMAIL_ERROR_COPY: Record<string, string> = {
  invalid_email: 'That email doesn’t look right — try again.',
  tos_required: 'Please accept the Terms to continue.',
  bot_check_failed: 'Bot check failed — refresh and try again.',
  magic_link_failed: 'Could not send the link — try again in a moment.',
}

function EmailState({
  mock,
  loginNext,
  onSent,
}: {
  mock: boolean
  loginNext: string
  onSent: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [tos, setTos] = useState(false)
  const [busy, setBusy] = useState(false)
  const token = useRef<string>('')

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!tos) {
        toast.error('Please accept the Terms to continue.')
        return
      }
      setBusy(true)
      try {
        if (mock) {
          // Dev MOCK mode — no Resend/Supabase; jump straight to the sent state.
          await sleep(500)
          onSent(email)
          return
        }
        const res = await requestMagicLinkInline({
          email,
          next: loginNext,
          turnstileToken: token.current || 'dev',
          tosAccepted: tos,
        })
        if (!res.ok) {
          toast.error(EMAIL_ERROR_COPY[res.error ?? 'magic_link_failed'])
          setBusy(false)
          return
        }
        onSent(email)
      } catch {
        toast.error('Could not send the link — check your email and try again.')
        setBusy(false)
      }
    },
    [email, loginNext, mock, onSent, tos]
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Same square footprint as the upload/result stage so the card height
          doesn't change between steps; fields sit centered in it. */}
      <div className="flex aspect-square w-full flex-col justify-center gap-4">
        <h3 className="text-lg">Enter your email</h3>
        <TurnstileWidget onToken={(t) => (token.current = t)} theme="light" />
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 rounded-xl"
        />
        <label className="text-muted-foreground flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            checked={tos}
            onChange={(e) => setTos(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      </div>
      <GradientButton type="submit" size="lg" disabled={busy} className="h-12">
        {busy ? 'Sending…' : 'Continue'}
      </GradientButton>
    </form>
  )
}

function SentState({ email }: { email: string }) {
  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-muted/30 px-6 text-center">
      <div className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-full">
        <Check className="size-6" aria-hidden />
      </div>
      <h3 className="text-lg">Check your email</h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        We sent a login link to <strong className="text-foreground">{email}</strong>. Click it to
        claim your headshot and unlock 5 more.
      </p>
    </div>
  )
}
