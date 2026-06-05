/**
 * Left-rail ad slot on the account page. Intentionally a static placeholder —
 * the real ad unit is wired in later. Kept as its own component so swapping in
 * an ad provider is a one-file change.
 */
export function AdPlaceholder() {
  return (
    <aside
      aria-label="Sponsored"
      className="border-border/60 bg-muted/40 hidden min-h-[420px] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed p-8 text-center lg:flex"
    >
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Ad space
      </span>
      <p className="text-muted-foreground/70 max-w-[12rem] text-xs">
        Your ad could be here.
      </p>
    </aside>
  )
}
