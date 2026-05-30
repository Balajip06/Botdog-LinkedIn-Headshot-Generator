import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
}))

let updateResult: { error: { message: string } | null } = { error: null }
const updateUserMock = vi.fn(async () => updateResult)

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      updateUser: (args: unknown) => {
        void args
        return updateUserMock()
      },
    },
  })),
}))

import { updatePassword } from './actions'

function lastRedirectUrl(err: unknown): string {
  if (err instanceof Error && err.message.startsWith('NEXT_REDIRECT:')) {
    return err.message.replace('NEXT_REDIRECT:', '')
  }
  throw err
}

function makeForm(overrides: Partial<Record<string, string>> = {}): FormData {
  const fd = new FormData()
  fd.set('password', 'new-correct-horse')
  fd.set('confirm', 'new-correct-horse')
  for (const [k, v] of Object.entries(overrides)) {
    if (v === '') fd.delete(k)
    else fd.set(k, v as string)
  }
  return fd
}

beforeEach(() => {
  updateResult = { error: null }
  updateUserMock.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('updatePassword', () => {
  it('redirects to ?error=password_too_short when password is < 8 chars', async () => {
    try {
      await updatePassword(makeForm({ password: 'short', confirm: 'short' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/reset-password?error=password_too_short')
      expect(updateUserMock).not.toHaveBeenCalled()
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=mismatch when passwords differ', async () => {
    try {
      await updatePassword(makeForm({ confirm: 'something-else-entirely' }))
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/reset-password?error=mismatch')
      expect(updateUserMock).not.toHaveBeenCalled()
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to ?error=update_failed when Supabase returns an error', async () => {
    updateResult = { error: { message: 'session expired' } }
    try {
      await updatePassword(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/reset-password?error=update_failed')
      return
    }
    throw new Error('redirect was not invoked')
  })

  it('redirects to /admin/login?sent=password_updated on success', async () => {
    try {
      await updatePassword(makeForm())
    } catch (err) {
      expect(lastRedirectUrl(err)).toBe('/admin/login?sent=password_updated')
      expect(updateUserMock).toHaveBeenCalledTimes(1)
      return
    }
    throw new Error('redirect was not invoked')
  })
})
