/**
 * Generates a one-time password-recovery URL for an existing auth user,
 * bypassing Resend / email send entirely. Prints the URL; click it to land
 * on /admin/reset-password and set a new password.
 *
 * Use this when Resend isn't configured yet — admin clicks "Forgot password"
 * in UI, no email goes out, then operator runs this script to get the URL
 * directly.
 *
 * Run: pnpm dlx tsx scripts/generate-recovery-link.ts <email>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected error'
}

async function main(): Promise<void> {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: pnpm dlx tsx scripts/generate-recovery-link.ts <email>')
    console.error('Example: pnpm dlx tsx scripts/generate-recovery-link.ts you@example.com')
    process.exit(1)
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error || !data) {
    console.error(`generateLink failed: ${error?.message ?? 'no data returned'}`)
    process.exit(1)
  }

  const hashedToken = data.properties?.hashed_token
  if (!hashedToken) {
    console.error('No hashed_token in response — cannot build confirm URL.')
    process.exit(1)
  }

  // Route through /auth/confirm (verifyOtp) so we don't need the
  // PKCE code_verifier cookie that service-role tokens never set.
  const url = `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=recovery&next=${encodeURIComponent('/admin/reset-password')}`

  console.log('')
  console.log('Click this URL to reset your admin password:')
  console.log('')
  console.log(url)
  console.log('')
  console.log(
    'One-time use. Expires in 1 hour. Lands at /admin/reset-password where you set a new password.'
  )
}

main().catch((err: unknown) => {
  console.error(getErrorMessage(err))
  process.exit(1)
})
