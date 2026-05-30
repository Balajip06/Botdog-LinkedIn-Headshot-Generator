'use client'

import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { GradientButton } from '@/components/brand/GradientButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'
import { issueRefund, type ReasonCategory } from './actions'

const PRESET_AMOUNTS = [5, 10, 25, 50] as const

const REASON_OPTIONS: { value: ReasonCategory; label: string; hint: string }[] = [
  { value: 'support', label: 'Support request', hint: 'Refund or apology credits' },
  { value: 'goodwill', label: 'Goodwill grant', hint: 'No specific incident' },
  {
    value: 'error_correction',
    label: 'Error correction',
    hint: 'System fault or wrong charge',
  },
  { value: 'vip_grant', label: 'VIP grant', hint: 'One-time bonus for partner/influencer' },
  { value: 'other', label: 'Other', hint: 'Specify in notes' },
]

interface RefundFormProps {
  defaultEmail?: string
  defaultUserId?: string
}

export function RefundForm({ defaultEmail = '', defaultUserId = '' }: RefundFormProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [selectedPreset, setSelectedPreset] = useState<number | null>(10)
  const [customMode, setCustomMode] = useState(false)
  const [customAmount, setCustomAmount] = useState<string>('10')
  const [reason, setReason] = useState<ReasonCategory>('support')
  const [notes, setNotes] = useState('')

  // Derived amount value submitted via the hidden input. We don't trust the
  // displayed amount alone — the server action re-validates 1..1000 via Zod.
  const amount = customMode ? customAmount : String(selectedPreset ?? '')

  const handlePresetClick = (val: number) => {
    setCustomMode(false)
    setSelectedPreset(val)
    setCustomAmount(String(val))
  }

  return (
    <form action={issueRefund} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">User email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          autoComplete="off"
        />
        {defaultUserId ? (
          <p className="text-xs text-muted-foreground">
            Target ID: <code className="font-mono">{defaultUserId}</code>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Credits</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((val) => {
            const active = !customMode && selectedPreset === val
            return (
              <button
                key={val}
                type="button"
                onClick={() => handlePresetClick(val)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-all',
                  active
                    ? 'bg-gradient-hero text-white shadow-glow-pink'
                    : 'border border-border bg-muted/40 text-foreground/80 hover:border-foreground/30 hover:text-foreground',
                )}
                aria-pressed={active}
              >
                +{val}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setCustomMode((m) => !m)}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold transition-all',
              customMode
                ? 'bg-gradient-hero text-white shadow-glow-pink'
                : 'border border-border bg-muted/40 text-foreground/80 hover:border-foreground/30 hover:text-foreground',
            )}
            aria-pressed={customMode}
          >
            Custom
          </button>
        </div>
        {customMode ? (
          <Input
            id="custom_amount"
            type="number"
            min={1}
            max={1000}
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Enter credit count"
            aria-label="Custom credit count"
            className="max-w-[200px]"
          />
        ) : null}
        <input type="hidden" name="amount" value={amount} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="reason_category">Reason</Label>
        <Select value={reason} onValueChange={(v) => setReason(v as ReasonCategory)}>
          <SelectTrigger id="reason_category" className="h-11 rounded-xl">
            <SelectValue placeholder="Pick one…" />
          </SelectTrigger>
          <SelectContent>
            {REASON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className="flex flex-col">
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.hint}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="reason_category" value={reason} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea
          id="notes"
          name="notes"
          maxLength={500}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. refund for failed gen #abc123, ticket #4421"
          className="min-h-[88px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <p className="text-xs text-muted-foreground">{notes.length}/500</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-200">
        <ShieldAlert className="size-4 shrink-0" />
        <span>
          Action is audited. Reason + notes persist to{' '}
          <code className="font-mono">source_ref</code> for compliance grep.
        </span>
      </div>

      <div>
        <GradientButton type="submit" size="md">
          Grant credits
        </GradientButton>
      </div>
    </form>
  )
}
