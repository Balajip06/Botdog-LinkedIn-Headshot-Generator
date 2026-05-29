import { ShieldAlert } from 'lucide-react'
import { FlashToasts } from '@/components/admin/FlashToasts'
import { GradientButton } from '@/components/brand/GradientButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { issueRefund } from './actions'

export const dynamic = 'force-dynamic'

interface RefundsPageProps {
  searchParams: Promise<{ error?: string; issued?: string }>
}

export default async function AdminRefundsPage({ searchParams }: RefundsPageProps) {
  await searchParams

  return (
    <section className="flex flex-col gap-8">
      <FlashToasts
        flashes={[
          { key: 'error', level: 'error' },
          { key: 'issued', level: 'info' },
        ]}
      />

      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Support
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Issue <span className="text-gradient-hero">refund credits</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Manual credit grant. Writes a row to <code className="font-mono text-xs">admin_audit_log</code> with{' '}
          <code className="font-mono text-xs">source=support</code> for compliance.
        </p>
      </header>

      <Card className="gap-4 py-6">
        <CardHeader className="px-6 pb-0">
          <CardTitle className="text-lg font-bold">New grant</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <form action={issueRefund} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">User email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="user@example.com"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
              <div className="flex flex-col gap-2">
                <Label htmlFor="amount">Credits</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={1}
                  max={1000}
                  defaultValue={10}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  name="reason"
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="e.g. refund for failed gen #abc123"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-200">
              <ShieldAlert className="size-4 shrink-0" />
              <span>
                Action is audited. The reason field is persisted to{' '}
                <code className="font-mono">source_ref</code> — keep it factual and grep-able.
              </span>
            </div>
            <div>
              <GradientButton type="submit" size="md">
                Grant credits
              </GradientButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
