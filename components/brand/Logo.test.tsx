import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

describe('Logo', () => {
  it('renders the gradient glyph SVG', () => {
    const { container } = render(<Logo />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders the linearGradient defs for the glyph fill', () => {
    const { container } = render(<Logo />)
    expect(container.querySelector('linearGradient#logo-grad')).not.toBeNull()
  })

  it('shows the Trendly wordmark by default', () => {
    render(<Logo />)
    expect(screen.getByText('Trendly')).toBeInTheDocument()
  })

  it('hides the wordmark when wordmark={false}', () => {
    render(<Logo wordmark={false} />)
    expect(screen.queryByText('Trendly')).not.toBeInTheDocument()
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

  it('renders a 48px-square SVG at size="lg"', () => {
    const { container } = render(<Logo size="lg" />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('48')
    expect(svg.getAttribute('height')).toBe('48')
  })

  it('applies text-gradient-hero to the wordmark when gradient={true}', () => {
    render(<Logo gradient />)
    expect(screen.getByText('Trendly')).toHaveClass('text-gradient-hero')
  })

  it('does not apply text-gradient-hero by default', () => {
    render(<Logo />)
    expect(screen.getByText('Trendly')).not.toHaveClass('text-gradient-hero')
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
    expect(screen.getByText('Trendly')).toHaveClass('text-base')
  })

  it('uses text-2xl sizing class at size="lg"', () => {
    render(<Logo size="lg" />)
    expect(screen.getByText('Trendly')).toHaveClass('text-2xl')
  })
})
