import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  /** Show wordmark text alongside the glyph. */
  wordmark?: boolean
  /** Tint the wordmark with brand blue (for use on light surfaces). */
  gradient?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const GLYPH_SIZE = { sm: 24, md: 32, lg: 44 } as const

/**
 * Botdog mark — a friendly rounded dog badge + wordmark.
 *
 * The badge head uses `currentColor` and the facial features use the gold
 * accent, so the mark adapts to its context: ink/blue on light surfaces,
 * white on the blue navbar pill (parent sets the text color).
 */
export function Logo({ className, wordmark = true, gradient = false, size = 'md' }: LogoProps) {
  const dim = GLYPH_SIZE[size]
  const textCls = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
        fill="none"
      >
        {/* ears */}
        <path d="M13 11 L19 4 L21 15 Z" fill="currentColor" />
        <path d="M35 11 L29 4 L27 15 Z" fill="currentColor" />
        {/* head */}
        <rect x="6" y="11" width="36" height="31" rx="12" fill="currentColor" />
        {/* eyes + nose in gold accent */}
        <circle cx="18" cy="25" r="2.6" fill="var(--tertiary)" />
        <circle cx="30" cy="25" r="2.6" fill="var(--tertiary)" />
        <circle cx="24" cy="32" r="2.4" fill="var(--tertiary)" />
      </svg>
      {wordmark && <span className={cn(textCls, gradient && 'text-primary')}>Botdog</span>}
    </span>
  )
}
