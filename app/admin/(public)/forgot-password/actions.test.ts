import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

let resetResult: { error: { message: string } | null } = { error: null }
const resetMock = vi.fn(async () => resetResult)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      resetPasswordForEmail: (email: string, opts: unknown) => {
        void email
        void opts
        return resetMock()
      },
    },
  })),
}))

import { sendResetEmail } from './actions'

function lastRedirectUrl(err: unknown): string {
  if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT:')) {
    return err.message.replace('NEXT_REDIRECT:', '')
  }
  throw err
}

function makeForm(email = 'admin@example.com'): FormData {
  const fd = new FormData()
  if (email) fd.set('email', email)
  return fd
}

beforeEach(() => {
  resetResult = { error: null }
  resetMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('sendResetEmail', () => {
  it('redirects to ?error=invalid_email when email is missing', async () => {
    try {
      await sendResetEmail(makeForm(''))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/forgot-password?error=invalid_email')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?sent=1 on the happy path', async () => {
    try {
      await sendResetEmail(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/forgot-password?sent=1')
      expect(resetMock).toHaveBeenCalledTimes(1)
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('still redirects to ?sent=1 even when Supabase returns an error (enumeration guard)', async () => {
    resetResult = { error: { message: 'user not found' } }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await sendResetEmail(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/forgot-password?sent=1')
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
      return
    }
    consoleSpy.mockRestore()
    throw new Error('redirect was not invoked')
  })
})
