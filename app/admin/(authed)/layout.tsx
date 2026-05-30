import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from './_actions/sign-out'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Middleware already gates /admin to authenticated admins, so user is
  // guaranteed to be present + admin-tier here. Read email for the sidebar
  // identity block.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email ?? null

  return (
    <AdminShell email={email} signOutAction={signOutAction}>
      {children}
    </AdminShell>
  )
}
