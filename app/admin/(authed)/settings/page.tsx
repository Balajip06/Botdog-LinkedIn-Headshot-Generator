import { SlidersHorizontal } from 'lucide-react'
import { FlashToasts } from '@/components/admin/FlashToasts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { createServiceClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils/cn'
import { updateActiveModel } from './actions'

export const dynamic = 'force-dynamic'

// Native <select> styled to match shadcn Input (server action reads formData
// directly — mirrors TrendFormSections).
const selectClasses = cn(
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none',
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'
)

const MODEL_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'nano-banana', label: 'Nano Banana 2 — Gemini · fast · $0.0039/img' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro — Gemini · quality · $0.024/img' },
  { value: 'gpt-image-2', label: 'ChatGPT Image 2 — OpenAI · $0.04/img' },
]

export default async function AdminSettingsPage() {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('app_settings')
    .select('active_model')
    .eq('id', true)
    .maybeSingle()
  const current = data?.active_model ?? 'nano-banana'

  return (
    <section className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <FlashToasts
        flashes={[
          { key: 'error', level: 'error' },
          { key: 'saved', level: 'success', message: 'Saved. Live for all customers now.' },
        ]}
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          <SlidersHorizontal className="size-5" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm">App-wide controls.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active image model</CardTitle>
          <CardDescription>
            The model that generates every customer headshot. Applies immediately — no redeploy,
            no eval gate — and customers cannot change it. If a generation fails, the other
            provider is tried once automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateActiveModel} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="active_model">Model</Label>
              <select
                id="active_model"
                name="active_model"
                defaultValue={current}
                className={selectClasses}
              >
                {MODEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
