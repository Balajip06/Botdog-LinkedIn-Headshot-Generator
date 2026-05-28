import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// Module-level mutable state controlled by individual tests.
const themeState: { resolvedTheme: string; setTheme: ReturnType<typeof vi.fn> } = {
  resolvedTheme: 'light',
  setTheme: vi.fn(),
}

vi.mock('next-themes', () => ({
  useTheme: () => themeState,
}))

// Import after vi.mock so the hook uses the mocked module.
import { ThemeToggle } from './ThemeToggle'

beforeEach(() => {
  themeState.resolvedTheme = 'light'
  themeState.setTheme = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('ThemeToggle — pre-mount placeholder', () => {
  // Server-side render path: useEffect never runs in renderToString, so the
  // component returns the placeholder branch deterministically. This is exactly
  // the markup users see on first paint before hydration completes.
  it('renders an opacity-0 + aria-hidden + tabindex=-1 placeholder during SSR', async () => {
    const { renderToString } = await import('react-dom/server')
    const html = renderToString(<ThemeToggle />)
    expect(html).toContain('opacity-0')
    expect(html).toContain('aria-hidden')
    expect(html).toContain('tabindex="-1"')
  })
})

describe('ThemeToggle — after mount', () => {
  it('renders a Moon icon when the resolved theme is light', () => {
    themeState.resolvedTheme = 'light'
    const { container } = render(<ThemeToggle />)
    // lucide-react renders inline SVGs; the moon icon has class "lucide-moon".
    expect(container.querySelector('svg.lucide-moon')).not.toBeNull()
    expect(container.querySelector('svg.lucide-sun')).toBeNull()
  })

  it('renders a Sun icon when the resolved theme is dark', () => {
    themeState.resolvedTheme = 'dark'
    const { container } = render(<ThemeToggle />)
    expect(container.querySelector('svg.lucide-sun')).not.toBeNull()
    expect(container.querySelector('svg.lucide-moon')).toBeNull()
  })

  it('uses the "switch to dark mode" aria-label when in light mode', () => {
    themeState.resolvedTheme = 'light'
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
  })

  it('uses the "switch to light mode" aria-label when in dark mode', () => {
    themeState.resolvedTheme = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument()
  })

  it('calls setTheme("dark") when clicked in light mode', () => {
    themeState.resolvedTheme = 'light'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    expect(themeState.setTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme("light") when clicked in dark mode', () => {
    themeState.resolvedTheme = 'dark'
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    expect(themeState.setTheme).toHaveBeenCalledWith('light')
  })
})
