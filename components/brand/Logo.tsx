import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  /** Show wordmark text alongside the glyph. */
  wordmark?: boolean
  /** Render text as gradient instead of solid. */
  gradient?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const GLYPH_SIZE = { sm: 24, md: 32, lg: 48 } as const

export function Logo({ className, wordmark = true, gradient = false, size = 'md' }: LogoProps) {
  const dim = GLYPH_SIZE[size]
  const textCls = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <span className={cn('inline-flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff2e63" />
            <stop offset="50%" stopColor="#ff8c42" />
            <stop offset="100%" stopColor="#ffd93d" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#logo-grad)" />
        <path
          d="M 14 32 Q 24 14 34 32"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="24" cy="22" r="3.5" fill="white" />
      </svg>
      {wordmark && <span className={cn(textCls, gradient && 'text-gradient-hero')}>Trendly</span>}
    </span>
  )
}
