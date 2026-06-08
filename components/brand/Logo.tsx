import Image from 'next/image'
import { cn } from '@/lib/utils/cn'

interface LogoProps {
  className?: string
  /** unused — kept for API compat; wordmark is baked into the SVG */
  wordmark?: boolean
  /** unused — kept for API compat */
  gradient?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const LOGO_SIZE = {
  sm: { width: 80, height: 24 },
  md: { width: 112, height: 34 },
  lg: { width: 148, height: 45 },
} as const

export function Logo({ className, size = 'md' }: LogoProps) {
  const { width, height } = LOGO_SIZE[size]
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Image
        src="/botdog-logo.svg"
        alt="Botdog"
        width={width}
        height={height}
        className="shrink-0"
        priority
      />
    </span>
  )
}
