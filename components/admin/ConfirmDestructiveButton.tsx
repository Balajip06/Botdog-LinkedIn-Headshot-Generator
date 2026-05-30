'use client'

// Reusable confirm-then-submit wrapper for destructive admin actions.
// Wraps a server-action form in a Radix Dialog so the action only fires
// after explicit confirmation — optionally requires typing a phrase (e.g.
// "DELETE") for hard-delete style operations. Keeps the existing
// progressive-enhancement contract: the form is real HTML and posts via
// the native form action when the user clicks Confirm.

import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ConfirmDestructiveButtonProps {
  /** Server action invoked with the underlying form's FormData on confirm. */
  formAction: (formData: FormData) => void | Promise<void>
  /** Trigger button label (e.g. "Delete trend"). */
  triggerLabel: string
  /** Trigger button variant — defaults to 'destructive'. */
  triggerVariant?: 'destructive' | 'outline' | 'ghost'
  /** Trigger button size — defaults to 'default'. */
  triggerSize?: 'sm' | 'default'
  /** Disabled state for the trigger button. */
  triggerDisabled?: boolean
  /** Dialog title (e.g. "Delete this trend?"). */
  title: string
  /** Dialog body (string or ReactNode for inline emphasis/links). */
  description: ReactNode
  /** Confirm button label (e.g. "Yes, delete"). */
  confirmLabel: string
  /**
   * If set, the Confirm button stays disabled until the user types this
   * exact phrase (case-sensitive). Use for hard-delete or otherwise
   * unrecoverable actions.
   */
  requireType?: string
  /** Hidden form fields submitted with the action (e.g. row id). */
  hiddenFields?: Record<string, string>
}

export function ConfirmDestructiveButton({
  formAction,
  triggerLabel,
  triggerVariant = 'destructive',
  triggerSize = 'default',
  triggerDisabled = false,
  title,
  description,
  confirmLabel,
  requireType,
  hiddenFields,
}: ConfirmDestructiveButtonProps) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')

  const typeOk = requireType ? typed === requireType : true

  // Reset the type-to-confirm input every time the dialog closes so the
  // next open starts blank — prevents a stale "DELETE" from auto-arming.
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setTyped('')
  }

  // Native form submit fires `formAction` — close the dialog as soon as the
  // user commits so they don't see the modal flicker during the redirect.
  function handleSubmit() {
    setOpen(false)
    setTyped('')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          disabled={triggerDisabled}
        >
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          </DialogHeader>

          {hiddenFields &&
            Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}

          {requireType && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-type" className="text-xs">
                Type <code className="bg-muted rounded px-1.5 py-0.5 font-mono">{requireType}</code>{' '}
                to confirm
              </Label>
              <Input
                id="confirm-type"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!typeOk}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
