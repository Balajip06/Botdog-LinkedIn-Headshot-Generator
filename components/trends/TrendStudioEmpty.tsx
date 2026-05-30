import { ArrowUp } from 'lucide-react'

/**
 * Empty-state card shown on /me/studio when no `?trend=<slug>` is selected
 * or when the slug points at a deactivated trend. Don't auto-select — keeps
 * the "browse first" feel and avoids a wasted schema fetch.
 */
export function TrendStudioEmpty() {
  return (
    <section
      aria-labelledby="studio-empty"
      id="upload"
      className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border/60 bg-card/30 px-6 py-12 text-center"
    >
      <div className="grid size-12 place-items-center rounded-full bg-gradient-hero text-white shadow-glow-pink">
        <ArrowUp className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 id="studio-empty" className="text-lg font-bold tracking-tight">
          Pick a trend above to get started
        </h2>
        <p className="text-sm text-muted-foreground">
          Tap any thumbnail and the upload form will appear right here.
        </p>
      </div>
    </section>
  )
}
