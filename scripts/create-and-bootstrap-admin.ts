/**
 * One-shot: creates an auth.users row via the service-role admin API
 * (email_confirm: true → no magic-link round-trip) and promotes them to
 * public.admin_users with role='admin'.
 *
 * Run: pnpm dlx tsx scripts/create-and-bootstrap-admin.ts <email>
 *
 * Idempotent — re-running with the same email finds the existing user and
 * upserts the admin role (no duplicate user creation).
 */

import { config } from 'dotenv'
import { createClient, type User } from '@supabase/supabase-js'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase()
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match
    if (data.users.length < 100) break
  }
  return null
}

async function main(): Promise<void> {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: pnpm dlx tsx scripts/create-and-bootstrap-admin.ts <email>')
    process.exit(1)
  }

  console.log(`Looking up ${email}...`)
  let user = await findUserByEmail(email)

  if (!user) {
    console.log(`No user found. Creating with email_confirm=true (skips magic-link)...`)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(`createUser failed: ${error?.message ?? 'no user returned'}`)
    }
    user = data.user
    console.log(`Created user ${user.id}`)
  } else {
    console.log(`Found existing user ${user.id}`)
  }

  console.log('Upserting admin_users row...')
  const { error: upsertError } = await supabase
    .from('admin_users')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })
  if (upsertError) {
    throw new Error(`upsert admin_users failed: ${upsertError.message}`)
  }

  console.log('Done. Sign in at localhost:3000/login with the same email (magic-link).')
}

main().catch((error: unknown) => {
  console.error(getErrorMessage(error))
  process.exit(1)
})
