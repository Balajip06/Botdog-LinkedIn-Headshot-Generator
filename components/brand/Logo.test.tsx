import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the glyph SVG', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders the dog-badge shapes (head rect + feature circles)', () => {
    const { container } = render(<Logo />)
    expect(container.querySelector('rect')).not.toBeNull()
    expect(container.querySelectorAll('circle').length).toBeGreaterThanOrEqual(3)
  })

  it('shows the Botdog wordmark by default', () => {
    render(<Logo />)
    expect(screen.getByText('Botdog')).toBeInTheDocument()
  })

  it('hides the wordmark when wordmark={false}', () => {
    render(<Logo wordmark={false} />)
    expect(screen.queryByText('Botdog')).not.toBeInTheDocument()
  })

  it('renders a 32px-square SVG at the default md size', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })

  it('renders a 24px-square SVG at size="sm"', () => {
    const { container } = render(<Logo size="sm" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('24')
    expect(svg.getAttribute('height')).toBe('24')
  })

  it('renders a 44px-square SVG at size="lg"', () => {
    const { container } = render(<Logo size="lg" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('44')
    expect(svg.getAttribute('height')).toBe('44')
  })

  it('tints the wordmark with text-primary when gradient={true}', () => {
    render(<Logo gradient />)
    expect(screen.getByText('Botdog')).toHaveClass('text-primary')
  })

  it('does not tint the wordmark by default', () => {
    render(<Logo />)
    expect(screen.getByText('Botdog')).not.toHaveClass('text-primary')
  })

  it('merges a custom className onto the wrapping span via cn()', () => {
    const { container } = render(<Logo className="custom-marker" />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).toHaveClass('custom-marker')
    expect(wrapper).toHaveClass('inline-flex')
  })

  it('marks the SVG as aria-hidden so screen readers skip it', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })

  it('uses text-base sizing class at size="sm"', () => {
    render(<Logo size="sm" />)
    expect(screen.getByText('Botdog')).toHaveClass('text-base')
  })

  it('uses text-2xl sizing class at size="lg"', () => {
    render(<Logo size="lg" />)
    expect(screen.getByText('Botdog')).toHaveClass('text-2xl')
  })
})
