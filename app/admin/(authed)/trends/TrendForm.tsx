import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  GenerationSection,
  IdentitySection,
  LifecycleSection,
  MediaSection,
  SchemaFaqSection,
  SeoSection,
  type TrendFormValues,
} from './TrendFormSections'

interface TrendFormProps {
  action: (formData: FormData) => Promise<void>
  initial?: TrendFormValues
  submitLabel: string
  banner?: ReactNode
  extraActions?: ReactNode
}

export function TrendForm({ action, initial = {}, submitLabel, banner, extraActions }: TrendFormProps) {
  return (
    <form action={action} className="flex flex-col gap-6">
      {banner}

      <IdentitySection initial={initial} />
      <GenerationSection initial={initial} />
      <LifecycleSection initial={initial} />
      <MediaSection initial={initial} />
      <SeoSection initial={initial} />
      <SchemaFaqSection initial={initial} />

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/95 px-4 py-3 shadow-soft backdrop-blur">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
        {extraActions}
      </div>
    </form>
  )
}
