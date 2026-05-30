import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

// signInWithPassword behaviour and the admin_users row lookup are both
// stubbed; tests flip these flags to simulate auth/admin outcomes.
let signInResult: {
  data: { user: { id: string } | null }
  error: { message: string } | null
} = { data: { user: { id: 'user-1' } }, error: null }
let adminRow: { user_id: string } | null = { user_id: 'user-1' }
const signOutMock = vi.fn(async () => ({ error: null }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async () => signInResult),
      signOut: signOutMock,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: adminRow, error: null })),
        })),
      })),
    })),
  })),
}))

import { signInWithPassword } from './actions'

function lastRedirectUrl(err: unknown): string {
  if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT:')) {
    return err.message.replace('NEXT_REDIRECT:', '')
  }
  throw err
}

function makeForm(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData()
  fd.set('email', 'admin@example.com')
  fd.set('password', 'correct-horse')
  fd.set('next', '/admin')
  for (const [k, v] of Object.entries(overrides)) {
    if (v === '') fd.delete(k)
    else fd.set(k, v as string)
  }
  return fd
}

beforeEach(() => {
  signInResult = { data: { user: { id: 'user-1' } }, error: null }
  adminRow = { user_id: 'user-1' }
  signOutMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('signInWithPassword', () => {
  it('redirects to ?error=invalid_credentials when email is missing', async () => {
    try {
      await signInWithPassword(makeForm({ email: '' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toMatch(/^\/admin\/login\?error=invalid_credentials/)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=invalid_credentials when password is missing', async () => {
    try {
      await signInWithPassword(makeForm({ password: '' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toMatch(/^\/admin\/login\?error=invalid_credentials/)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=password_too_short when password is < 8 chars', async () => {
    try {
      await signInWithPassword(makeForm({ password: 'short' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toMatch(/^\/admin\/login\?error=password_too_short/)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=invalid_credentials when Supabase auth fails', async () => {
    signInResult = { data: { user: null }, error: { message: 'invalid grant' } }
    try {
      await signInWithPassword(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toMatch(/^\/admin\/login\?error=invalid_credentials/)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('signs out + redirects to ?error=not_admin when authed user has no admin_users row', async () => {
    adminRow = null
    try {
      await signInWithPassword(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/login?error=not_admin')
      expect(signOutMock).toHaveBeenCalledTimes(1)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to safe `next` on the happy path', async () => {
    try {
      await signInWithPassword(makeForm({ next: '/admin/trends' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/trends')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('sanitizes unsafe `next` (open-redirect attempt) → falls back to /', async () => {
    try {
      await signInWithPassword(makeForm({ next: '//evil.com' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/')
      return
    }
    throw new Error('redirect was not invoked')
  })
})
