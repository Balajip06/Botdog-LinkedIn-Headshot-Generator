import { cn } from '@/lib/utils/cn'

/**
 * Inline-SVG chart primitives used across the admin dashboards.
 *
 * Pure server components — no client JS, no chart-lib dependency. Each chart
 * computes a 0–1 normalized path/bar set against the supplied series so the
 * caller can hand in raw counts/usd values without massaging them first.
 */

export interface ChartPoint {
  /** Display label for the bucket (e.g. "Mon", "May 28"). */
  label: string
  /** Raw numeric value for the bucket. Negative values are clamped to 0. */
  value: number
}

interface SparklineProps {
  data: readonly ChartPoint[]
  /** Tailwind text-color utility applied via currentColor stroke/fill. */
  className?: string
  /** Optional second series rendered as a dashed reference line. */
  compare?: readonly ChartPoint[]
  /** Aria label that describes the trend for screen readers. */
  ariaLabel: string
  height?: number
}

function maxValue(...series: readonly (readonly ChartPoint[])[]): number {
  let max = 0
  for (const s of series) {
    for (const p of s) {
      if (p.value > max) max = p.value
    }
  }
  return max
}

function pointsToPath(
  data: readonly ChartPoint[],
  width: number,
  height: number,
  max: number
): string {
  if (data.length === 0) return ''
  if (max <= 0) {
    const y = height - 1
    return `M 0,${y} L ${width},${y}`
  }
  const step = data.length === 1 ? 0 : width / (data.length - 1)
  return data
    .map((p, i) => {
      const x = data.length === 1 ? width / 2 : i * step
      const y = height - (Math.max(0, p.value) / max) * (height - 4) - 2
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function Sparkline({ data, className, compare, ariaLabel, height = 64 }: SparklineProps) {
  const width = 320
  const max = maxValue(data, compare ?? [])
  const path = pointsToPath(data, width, height, max)
  const comparePath = compare ? pointsToPath(compare, width, height, max) : null
  const lastX = data.length === 0 ? 0 : width
  const lastY =
    data.length === 0 || max === 0
      ? height - 1
      : height - (Math.max(0, data[data.length - 1].value) / max) * (height - 4) - 2

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('h-16 w-full', className)}
    >
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      {path && (
        <>
          <path
            d={`${path} L ${width},${height} L 0,${height} Z`}
            fill="url(#sparkline-fill)"
            stroke="none"
          />
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={lastX} cy={lastY} r={3} fill="currentColor" />
        </>
      )}
      {comparePath && (
        <path
          d={comparePath}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeDasharray="4 4"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

interface BarChartProps {
  data: readonly ChartPoint[]
  ariaLabel: string
  /** Optional secondary series stacked beside the primary bars (e.g. revenue vs spend). */
  secondary?: { data: readonly ChartPoint[]; label: string; className: string }
  primaryLabel: string
  primaryClassName?: string
  height?: number
  /** When supplied, formats axis tick labels (e.g. usd, percent). */
  formatValue?: (n: number) => string
}

export function BarChart({
  data,
  ariaLabel,
  secondary,
  primaryLabel,
  primaryClassName,
  height = 180,
  formatValue,
}: BarChartProps) {
  const width = 480
  const padding = { top: 12, right: 8, bottom: 24, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = maxValue(data, secondary?.data ?? [])
  const ticks = max === 0 ? [0] : [0, max / 2, max]
  const slot = data.length === 0 ? innerW : innerW / data.length
  const barW = secondary ? Math.max(4, slot * 0.32) : Math.max(6, slot * 0.55)
  const gap = secondary ? Math.max(2, slot * 0.06) : 0

  const fmt = formatValue ?? ((n: number) => Math.round(n).toLocaleString('en-US'))

  return (
    <div className="flex flex-col gap-3">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
      >
        {ticks.map((t, i) => {
          const y = padding.top + innerH - (max === 0 ? 0 : (t / max) * innerH)
          return (
            <g key={i}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 4"
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                fontSize={9}
                textAnchor="end"
                fill="currentColor"
                fillOpacity={0.5}
              >
                {fmt(t)}
              </text>
            </g>
          )
        })}

        {data.map((p, i) => {
          const x = padding.left + i * slot
          const v = Math.max(0, p.value)
          const h = max === 0 ? 0 : (v / max) * innerH
          const cx = x + (slot - (secondary ? barW * 2 + gap : barW)) / 2
          const secValue = secondary ? Math.max(0, secondary.data[i]?.value ?? 0) : 0
          const secH = max === 0 ? 0 : (secValue / max) * innerH
          return (
            <g key={`${p.label}-${i}`}>
              <rect
                x={cx}
                y={padding.top + innerH - h}
                width={barW}
                height={h}
                rx={3}
                className={cn('fill-current', primaryClassName)}
              >
                <title>{`${p.label}: ${fmt(p.value)}`}</title>
              </rect>
              {secondary && (
                <rect
                  x={cx + barW + gap}
                  y={padding.top + innerH - secH}
                  width={barW}
                  height={secH}
                  rx={3}
                  className={cn('fill-current', secondary.className)}
                >
                  <title>{`${p.label} (${secondary.label}): ${fmt(secValue)}`}</title>
                </rect>
              )}
              <text
                x={x + slot / 2}
                y={height - 8}
                fontSize={9}
                textAnchor="middle"
                fill="currentColor"
                fillOpacity={0.55}
              >
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="text-muted-foreground flex items-center gap-4 px-1 text-[11px]">
        <span className={cn('inline-flex items-center gap-1.5', primaryClassName)}>
          <span className="inline-block size-2 rounded-sm bg-current" />
          <span className="text-muted-foreground">{primaryLabel}</span>
        </span>
        {secondary && (
          <span className={cn('inline-flex items-center gap-1.5', secondary.className)}>
            <span className="inline-block size-2 rounded-sm bg-current" />
            <span className="text-muted-foreground">{secondary.label}</span>
          </span>
        )}
      </div>
    </div>
  )
}

interface DonutDatum {
  label: string
  value: number
  className: string
}

interface DonutChartProps {
  data: readonly DonutDatum[]
  ariaLabel: string
  /** Center label (e.g. total). */
  centerValue: string
  centerLabel: string
}

export function DonutChart({ data, ariaLabel, centerValue, centerLabel }: DonutChartProps) {
  const size = 160
  const radius = 64
  const stroke = 22
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0)
  const circumference = 2 * Math.PI * radius
  let offsetAccum = 0

  return (
    <div className="flex items-center gap-5">
      <svg role="img" aria-label={ariaLabel} viewBox={`0 0 ${size} ${size}`} className="size-40">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={stroke}
        />
        {total > 0 &&
          data.map((d, i) => {
            const v = Math.max(0, d.value)
            const fraction = v / total
            const dash = fraction * circumference
            const gap = circumference - dash
            const dashOffset = -offsetAccum
            offsetAccum += dash
            return (
              <circle
                key={`${d.label}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                className={d.className}
                strokeLinecap="butt"
              />
            )
          })}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fontSize={20}
          fontWeight={700}
          fill="currentColor"
        >
          {centerValue}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.6}
        >
          {centerLabel}
        </text>
      </svg>
      <ul className="flex flex-col gap-1.5 text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className={cn('inline-block size-2.5 rounded-sm bg-current', d.className)} />
            <span className="text-foreground font-mono tabular-nums">
              {Math.round(d.value).toLocaleString('en-US')}
            </span>
            <span className="text-muted-foreground">{d.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface DeltaProps {
  current: number
  previous: number
  /** Format the absolute value (e.g. "%.1f%" for CTR). Defaults to integer. */
  format?: (n: number) => string
  /** When true, an increase is "bad" (e.g. cost). Defaults to false. */
  invert?: boolean
}

export function Delta({ current, previous, format, invert = false }: DeltaProps) {
  const diff = current - previous
  const pct = previous === 0 ? (current === 0 ? 0 : 100) : (diff / previous) * 100
  const positive = invert ? diff < 0 : diff > 0
  const flat = diff === 0
  const fmt = format ?? ((n: number) => `${Math.abs(n).toFixed(1)}%`)
  const cls = flat
    ? 'text-muted-foreground'
    : positive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'
  const arrow = flat ? '·' : positive ? '↑' : '↓'
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-xs tabular-nums', cls)}>
      <span aria-hidden="true">{arrow}</span>
      <span>{fmt(pct)}</span>
    </span>
  )
}
