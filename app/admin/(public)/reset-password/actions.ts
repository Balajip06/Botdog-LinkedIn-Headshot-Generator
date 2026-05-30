'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Finalize a password reset.
 *
 * Supabase delivers the user here from the reset email with a recovery
 * session already in cookies, so `updateUser({ password })` operates on the
 * authed identity. On success we redirect to /admin/login with a flash so
 * the admin re-enters credentials (rather than auto-elevating into /admin).
 */
export async function updatePassword(formData: FormData): Promise<void> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) {
    redirect('/admin/reset-password?error=password_too_short')
  }
  if (password !== confirm) {
    redirect('/admin/reset-password?error=mismatch')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/admin/reset-password?error=update_failed`)
  }

  redirect('/admin/login?sent=password_updated')
}
