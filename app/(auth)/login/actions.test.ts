import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers({ 'x-forwarded-for': '1.2.3.4' })),
}))

let turnstileOk = true
vi.mock('@/lib/turnstile/verify', () => ({
  verifyTurnstile: vi.fn(async () => turnstileOk),
}))

// Controls per-test behaviour of the Supabase stub.
let signInWithOtpResult: { error: { message: string } | null } = { error: null }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: vi.fn(async () => signInWithOtpResult),
    },
  })),
}))

import { signInWithMagicLink } from './actions'

function lastRedirectUrl(err: unknown): string {
  if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT:')) {
    return err.message.replace('NEXT_REDIRECT:', '')
  }
  throw err
}

function makeForm(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData()
  fd.set('email', 'user@example.com')
  fd.set('next', '/')
  fd.set('turnstile_token', 'tok-ok')
  fd.set('tos_accepted', '1')
  for (const [k, v] of Object.entries(overrides)) {
    if (v === '') fd.delete(k)
    else fd.set(k, v as string)
  }
  return fd
}

beforeEach(() => {
  turnstileOk = true
  signInWithOtpResult = { error: null }
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('signInWithMagicLink', () => {
  it('redirects to ?error=tos_required when checkbox is not checked', async () => {
    try {
      await signInWithMagicLink(makeForm({ tos_accepted: '0' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?error=tos_required')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=tos_required when tos_accepted is absent entirely', async () => {
    try {
      await signInWithMagicLink(makeForm({ tos_accepted: '' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?error=tos_required')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=invalid_email when email is malformed', async () => {
    try {
      await signInWithMagicLink(makeForm({ email: 'not-an-email' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?error=invalid_email')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=bot_check_failed when Turnstile rejects', async () => {
    turnstileOk = false
    try {
      await signInWithMagicLink(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?error=bot_check_failed')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?sent=1 on the happy path (link emailed)', async () => {
    try {
      await signInWithMagicLink(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?sent=1')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=magic_link_failed when Supabase returns an error', async () => {
    signInWithOtpResult = { error: { message: 'rate limited' } }
    try {
      await signInWithMagicLink(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/login?error=magic_link_failed')
      return
    }
    throw new Error('redirect was not invoked')
  })
})
