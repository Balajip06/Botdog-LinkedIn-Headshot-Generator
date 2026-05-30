import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

// Mock next/link — not used by ConfirmDestructiveButton itself, but Radix's
// Dialog primitives don't pull it; keep this empty as a sanity guard.

import { ConfirmDestructiveButton } from './ConfirmDestructiveButton'

beforeEach(() => {
  // Stub IntersectionObserver — Radix Dialog focus traps query it on mount.
  // jsdom doesn't ship one.
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    class FakeIO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return []
      }
    }
    // @ts-expect-error — jsdom shim
    globalThis.IntersectionObserver = FakeIO
  }
})

afterEach(() => {
  cleanup()
})

describe('ConfirmDestructiveButton', () => {
  it('renders the trigger button with the configured label', () => {
    render(
      <ConfirmDestructiveButton
        formAction={vi.fn()}
        triggerLabel="Delete trend"
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
      />
    )
    expect(screen.getByRole('button', { name: 'Delete trend' })).toBeInTheDocument()
  })

  it('does not render the dialog content until the trigger is clicked', () => {
    render(
      <ConfirmDestructiveButton
        formAction={vi.fn()}
        triggerLabel="Delete trend"
        title="Hidden title"
        description="Hidden description"
        confirmLabel="Yes, delete"
      />
    )
    expect(screen.queryByText('Hidden title')).not.toBeInTheDocument()
  })

  it('opens the dialog when the trigger is clicked', () => {
    render(
      <ConfirmDestructiveButton
        formAction={vi.fn()}
        triggerLabel="Delete trend"
        title="Visible title"
        description="Visible description"
        confirmLabel="Yes, delete"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Visible title')).toBeInTheDocument()
    expect(screen.getByText('Visible description')).toBeInTheDocument()
  })

  it('closes the dialog when Cancel is clicked without invoking formAction', () => {
    const formAction = vi.fn()
    render(
      <ConfirmDestructiveButton
        formAction={formAction}
        triggerLabel="Delete trend"
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(formAction).not.toHaveBeenCalled()
  })

  it('invokes formAction with a FormData when Confirm is clicked (no requireType)', () => {
    const formAction = vi.fn()
    render(
      <ConfirmDestructiveButton
        formAction={formAction}
        triggerLabel="Revoke VIP"
        title="Revoke?"
        description="Soft action."
        confirmLabel="Yes, revoke"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Revoke VIP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, revoke' }))

    expect(formAction).toHaveBeenCalledTimes(1)
    const arg = formAction.mock.calls[0]?.[0] as FormData
    expect(arg).toBeInstanceOf(FormData)
  })

  it('keeps the Confirm button disabled until the type-to-confirm phrase matches', () => {
    const formAction = vi.fn()
    render(
      <ConfirmDestructiveButton
        formAction={formAction}
        triggerLabel="Delete trend"
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
        requireType="DELETE"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))

    const confirmBtn = screen.getByRole('button', { name: 'Yes, delete' })
    expect(confirmBtn).toBeDisabled()

    const typeInput = screen.getByLabelText(/Type .* to confirm/i)
    fireEvent.change(typeInput, { target: { value: 'delete' } }) // wrong case
    expect(confirmBtn).toBeDisabled()

    fireEvent.change(typeInput, { target: { value: 'DELETE' } })
    expect(confirmBtn).not.toBeDisabled()
  })

  it('submits hidden fields as part of the FormData payload', () => {
    const formAction = vi.fn()
    render(
      <ConfirmDestructiveButton
        formAction={formAction}
        triggerLabel="Revoke VIP"
        title="Revoke?"
        description="Soft action."
        confirmLabel="Yes, revoke"
        hiddenFields={{ user_id: 'abc-123', enable: '0' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Revoke VIP' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, revoke' }))

    const arg = formAction.mock.calls[0]?.[0] as FormData
    expect(arg.get('user_id')).toBe('abc-123')
    expect(arg.get('enable')).toBe('0')
  })

  it('resets the type-to-confirm input when the dialog is closed and reopened', () => {
    render(
      <ConfirmDestructiveButton
        formAction={vi.fn()}
        triggerLabel="Delete trend"
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
        requireType="DELETE"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))
    fireEvent.change(screen.getByLabelText(/Type .* to confirm/i), {
      target: { value: 'DELETE' },
    })
    expect(screen.getByRole('button', { name: 'Yes, delete' })).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))

    // Re-armed dialog should require typing again.
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeDisabled()
    expect(screen.getByLabelText(/Type .* to confirm/i)).toHaveValue('')
  })

  it('respects triggerDisabled', () => {
    render(
      <ConfirmDestructiveButton
        formAction={vi.fn()}
        triggerLabel="Delete trend"
        triggerDisabled
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
      />
    )
    expect(screen.getByRole('button', { name: 'Delete trend' })).toBeDisabled()
  })

  // Ensure act() compatibility — guard against future async work.
  it('coexists with async state updates wrapped in act', async () => {
    const formAction = vi.fn()
    render(
      <ConfirmDestructiveButton
        formAction={formAction}
        triggerLabel="Delete trend"
        title="Delete?"
        description="Permanent."
        confirmLabel="Yes, delete"
      />
    )
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete trend' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    })
    expect(formAction).toHaveBeenCalledTimes(1)
  })
})
