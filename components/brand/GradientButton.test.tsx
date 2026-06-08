import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GradientButton } from './GradientButton'

describe('GradientButton', () => {
  it('renders a <button> element by default', () => {
    render(<GradientButton>Go</GradientButton>)
    const btn = screen.getByRole('button', { name: 'Go' })
    expect(btn.tagName).toBe('BUTTON')
  })

  it('tags the rendered element with data-slot="gradient-button"', () => {
    render(<GradientButton>Go</GradientButton>)
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'gradient-button')
  })

  it('applies brand-grad + shadow-button classes', () => {
    render(<GradientButton>Go</GradientButton>)
    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('brand-grad')
    expect(btn).toHaveClass('shadow-button')
  })

  it('applies h-9 height at size="sm"', () => {
    render(<GradientButton size="sm">x</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('h-9')
  })

  it('applies h-11 height at default size="md"', () => {
    render(<GradientButton>x</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('h-11')
  })

  it('applies h-12 height at size="lg"', () => {
    render(<GradientButton size="lg">x</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('h-12')
  })

  it('applies h-14 height at size="xl"', () => {
    render(<GradientButton size="xl">x</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('h-14')
  })

  it('forwards the type attribute', () => {
    render(<GradientButton type="submit">submit</GradientButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('forwards the disabled attribute', () => {
    render(<GradientButton disabled>disabled</GradientButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('forwards onClick handler', () => {
    const onClick = vi.fn()
    render(<GradientButton onClick={onClick}>tap</GradientButton>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('merges a custom className onto the rendered button', () => {
    render(<GradientButton className="extra-class">x</GradientButton>)
    expect(screen.getByRole('button')).toHaveClass('extra-class')
  })

  it('renders as the child element when asChild={true}', () => {
    render(
      <GradientButton asChild>
        <a href="/somewhere">Anchor</a>
      </GradientButton>
    )
    const link = screen.getByRole('link', { name: 'Anchor' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/somewhere')
    expect(link).toHaveAttribute('data-slot', 'gradient-button')
  })

  it('applies disabled:opacity-50 styling hook when disabled', () => {
    render(<GradientButton disabled>x</GradientButton>)
    // The class is always present; it activates via the disabled pseudo-state.
    // Asserting its presence is the meaningful contract.
    expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50')
  })
})
