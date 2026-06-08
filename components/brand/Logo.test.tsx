import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './Logo'

// The Logo renders the baked brand wordmark as a single <Image> (next/image →
// an <img> in the test env) with alt="Botdog". The `wordmark`/`gradient` props
// are kept for API compatibility but no longer change the output.
describe('Logo', () => {
  it('renders the Botdog wordmark image with accessible alt text', () => {
    render(<Logo />)
    expect(screen.getByAltText('Botdog')).toBeInTheDocument()
  })

  it('points at the brand SVG asset', () => {
    render(<Logo />)
    expect(screen.getByAltText('Botdog')).toHaveAttribute('src', '/botdog-logo.svg')
  })

  it('renders at the default md size (112x34)', () => {
    render(<Logo />)
    const img = screen.getByAltText('Botdog')
    expect(img).toHaveAttribute('width', '112')
    expect(img).toHaveAttribute('height', '34')
  })

  it('renders at size="sm" (80x24)', () => {
    render(<Logo size="sm" />)
    const img = screen.getByAltText('Botdog')
    expect(img).toHaveAttribute('width', '80')
    expect(img).toHaveAttribute('height', '24')
  })

  it('renders at size="lg" (148x45)', () => {
    render(<Logo size="lg" />)
    const img = screen.getByAltText('Botdog')
    expect(img).toHaveAttribute('width', '148')
    expect(img).toHaveAttribute('height', '45')
  })

  it('merges a custom className onto the wrapping span via cn()', () => {
    const { container } = render(<Logo className="custom-marker" />)
    const wrapper = container.firstElementChild as HTMLElement
    expect(wrapper).toHaveClass('custom-marker')
    expect(wrapper).toHaveClass('inline-flex')
  })

  it('accepts the legacy gradient/wordmark props without changing output', () => {
    render(<Logo gradient wordmark />)
    expect(screen.getByAltText('Botdog')).toHaveAttribute('src', '/botdog-logo.svg')
  })
})
