/**
 * Promotes a user to public.admin_users with role='admin' using the
 * service-role client (bypasses RLS). Optionally sets/resets the user's
 * password so they can sign in via /admin/login (email + password).
 *
 * Run: pnpm bootstrap:admin <email> [password]
 *
 * Without password: user must already exist in auth.users. Idempotent
 *   upsert on user_id.
 * With password: ≥8 chars. If user doesn't exist, creates them with
 *   email_confirm=true and sets the password. If they do exist, password
 *   is updated via auth.admin.updateUserById.
 *
 * Schema reference (supabase/migrations/20260527000004_ancillary.sql):
 *   public.admin_users (user_id uuid pk, role admin_role, created_at timestamptz)
 *   admin_role enum: 'admin' | 'editor'
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

const USAGE = 'Usage: pnpm bootstrap:admin <email> [password]'
const MIN_PASSWORD_LENGTH = 8

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return 'Unexpected error'
}

async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.toLowerCase()
  const perPage = 100
  // listUsers is paginated. One page (100 users) covers the bootstrap case;
  // loop a handful more in case the project has grown.
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(`listUsers failed on page ${page}: ${error.message}`)
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (match) return match
    if (data.users.length < perPage) break
  }
  return null
}

async function setPassword(userId: string, password: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password })
  if (error) throw new Error(`updateUserById failed: ${error.message}`)
}

async function createUserWithPassword(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? 'no user returned'}`)
  }
  return data.user
}

async function main(): Promise<void> {
  const email = process.argv[2]
  const password = process.argv[3]
  if (!email || email === '--help' || email === '-h') {
    console.error(USAGE)
    process.exit(1)
  }

  if (password !== undefined && password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
    process.exit(1)
  }

  console.log(`Looking up ${email}...`)
  let user = await findUserByEmail(email)

  if (!user) {
    if (!password) {
      console.error(
        `No user found with email '${email}'. Sign up at localhost:3000/login first, or pass a password to create the user inline.`
      )
      process.exit(1)
    }
    console.log('No user found. Creating with email_confirm=true...')
    user = await createUserWithPassword(email, password)
    console.log(`Created user ${user.id}`)
  } else {
    console.log(`Found user ${user.id}`)
    if (password) {
      console.log('Setting password...')
      await setPassword(user.id, password)
    }
  }

  console.log('Inserting/upserting admin_users row...')
  const { error } = await supabase
    .from('admin_users')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })
  if (error) {
    throw new Error(`upsert admin_users failed: ${error.message}`)
  }

  console.log(
    'Admin bootstrapped. Sign in at http://localhost:3000/admin/login with email + password.'
  )
}

main().catch((error: unknown) => {
  console.error(getErrorMessage(error))
  process.exit(1)
})
