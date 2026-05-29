import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { StatusBadge, type Status } from './StatusBadge'

afterEach(() => {
  cleanup()
})

describe('StatusBadge', () => {
  it('renders "Queued" label for pending status', () => {
    // Arrange / Act
    render(<StatusBadge status="pending" attempts={0} />)

    // Assert
    expect(screen.getByText('Queued')).toBeInTheDocument()
  })

  it('renders "Generating" label for processing status', () => {
    render(<StatusBadge status="processing" attempts={0} />)
    expect(screen.getByText('Generating')).toBeInTheDocument()
  })

  it('renders "Done" label for completed status', () => {
    render(<StatusBadge status="completed" attempts={0} />)
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders "Failed" label for failed status', () => {
    render(<StatusBadge status="failed" attempts={0} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('interpolates attempts into label for failed_retryable status', () => {
    render(<StatusBadge status="failed_retryable" attempts={2} />)
    expect(screen.getByText('Retrying 2/3')).toBeInTheDocument()
  })

  it('applies cyan + animate-pulse class for processing status', () => {
    render(<StatusBadge status="processing" attempts={0} />)
    const badge = screen.getByText('Generating')
    expect(badge.className).toContain('animate-pulse')
    expect(badge.className).toContain('brand-cyan')
  })

  it('accepts the documented Status union type at compile time', () => {
    // Compile-time assert: assigning each literal must not error.
    const statuses: Status[] = ['pending', 'processing', 'completed', 'failed', 'failed_retryable']
    expect(statuses).toHaveLength(5)
  })
})
