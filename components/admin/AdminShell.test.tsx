import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'

// AdminShell pulls in ThemeToggle which calls next-themes' useTheme. Mock it
// the same way ThemeToggle.test.tsx does so the component renders deterministically
// in jsdom (no ThemeProvider, no flashing).
const themeState: { resolvedTheme: string; setTheme: ReturnType<typeof vi.fn> } = {
  resolvedTheme: 'light',
  setTheme: vi.fn(),
}

vi.mock('next-themes', () => ({
  useTheme: () => themeState,
}))

// AdminShell calls usePathname() to highlight the active nav item. Outside an
// App Router context (jsdom) it would return null — explicit mock keeps the
// test deterministic and lets us assert active-link styling later if needed.
const navState: { pathname: string } = { pathname: '/admin' }
vi.mock('next/navigation', () => ({
  usePathname: () => navState.pathname,
}))

// Import after vi.mock so the SUT picks up the mocked module.
import { AdminShell } from './AdminShell'

const DEFAULT_PROPS = {
  email: 'admin@example.com',
  signOutAction: async () => {},
}

beforeEach(() => {
  themeState.resolvedTheme = 'light'
  themeState.setTheme = vi.fn()
  navState.pathname = '/admin'
})

afterEach(() => {
  cleanup()
})

describe('AdminShell', () => {
  it('renders the "Admin console" label and an INTERNAL badge', () => {
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    // The label exists in both the sidebar and the mobile header — both render
    // in jsdom because lg:hidden is CSS-only. Either match is fine.
    expect(screen.getAllByText('Admin console').length).toBeGreaterThan(0)
    expect(screen.getAllByText('internal').length).toBeGreaterThan(0)
  })

  it('renders the brand Logo with the "Admin home" aria-label on its wrapping link', () => {
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    const adminHome = screen.getByRole('link', { name: 'Admin home' })
    expect(adminHome).toBeInTheDocument()
    expect(adminHome).toHaveAttribute('href', '/admin')
    // The Logo glyph is an inline svg inside this link.
    expect(adminHome.querySelector('svg')).not.toBeNull()
  })

  it('renders the primary section links with the correct hrefs', () => {
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    expect(screen.getByRole('link', { name: /^Dashboard$/ })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('link', { name: /^Engagement$/ })).toHaveAttribute(
      'href',
      '/admin/engagement'
    )
    expect(screen.getByRole('link', { name: /^Margin$/ })).toHaveAttribute('href', '/admin/margin')
    expect(screen.getByRole('link', { name: /^Trends$/ })).toHaveAttribute('href', '/admin/trends')
    expect(screen.getByRole('link', { name: /^Suggestions$/ })).toHaveAttribute(
      'href',
      '/admin/suggestions'
    )
    expect(screen.getByRole('link', { name: /^Referrals$/ })).toHaveAttribute(
      'href',
      '/admin/referrals'
    )
    expect(screen.getByRole('link', { name: /^Refunds$/ })).toHaveAttribute(
      'href',
      '/admin/refunds'
    )
    expect(screen.getByRole('link', { name: /^Audit$/ })).toHaveAttribute('href', '/admin/audit')
    expect(screen.getByRole('link', { name: '← App' })).toHaveAttribute('href', '/')
  })

  it('renders children inside the <main> content region', () => {
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p data-testid="child-marker">child payload</p>
      </AdminShell>
    )
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main.querySelector('[data-testid="child-marker"]')).not.toBeNull()
    expect(main.textContent).toContain('child payload')
  })

  it('marks the mobile header as sticky at the top of the viewport', () => {
    const { container } = render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    expect(header).toHaveClass('sticky')
    expect(header).toHaveClass('top-0')
  })

  it('marks the current section as the active nav item', () => {
    navState.pathname = '/admin/engagement'
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    const engagement = screen.getByRole('link', { name: /^Engagement$/ })
    expect(engagement).toHaveAttribute('aria-current', 'page')
  })

  it('treats nested trend routes as the Trends section', () => {
    navState.pathname = '/admin/trends/abc/edit'
    render(
      <AdminShell {...DEFAULT_PROPS}>
        <p>child</p>
      </AdminShell>
    )
    const trends = screen.getByRole('link', { name: /^Trends$/ })
    expect(trends).toHaveAttribute('aria-current', 'page')
  })

  describe('mobile drawer', () => {
    it('renders the hamburger button in the mobile header (md:hidden)', () => {
      const { container } = render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      const hamburger = screen.getByRole('button', { name: 'Open menu' })
      expect(hamburger).toBeInTheDocument()
      // Mobile header should be md:hidden — desktop hides the whole header.
      const header = container.querySelector('header')
      expect(header).not.toBeNull()
      expect(header).toHaveClass('md:hidden')
    })

    it('keeps the drawer closed by default and exposes aria-expanded=false', () => {
      render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      const hamburger = screen.getByRole('button', { name: 'Open menu' })
      expect(hamburger).toHaveAttribute('aria-expanded', 'false')
      const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
      expect(drawer).toHaveAttribute('data-state', 'closed')
    })

    it('opens the drawer when the hamburger is clicked', () => {
      render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
        'aria-expanded',
        'true'
      )
      const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
      expect(drawer).toHaveAttribute('data-state', 'open')
      // Close button is rendered + focused for keyboard users.
      const closeBtn = screen.getByRole('button', { name: 'Close menu' })
      expect(closeBtn).toBeInTheDocument()
    })

    it('closes the drawer when the close button is clicked', () => {
      render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      fireEvent.click(screen.getByRole('button', { name: 'Close menu' }))
      expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
      const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
      expect(drawer).toHaveAttribute('data-state', 'closed')
    })

    it('closes the drawer when the backdrop is clicked', () => {
      render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
      // The backdrop is the first child div (aria-hidden, onClick=close).
      const backdrop = drawer.querySelector('div[aria-hidden="true"]') as HTMLElement | null
      expect(backdrop).not.toBeNull()
      fireEvent.click(backdrop as HTMLElement)
      expect(drawer).toHaveAttribute('data-state', 'closed')
    })

    it('closes the drawer when Escape is pressed', () => {
      render(
        <AdminShell {...DEFAULT_PROPS}>
          <p>child</p>
        </AdminShell>
      )
      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
      const drawer = screen.getByRole('dialog', { name: 'Admin navigation' })
      expect(drawer).toHaveAttribute('data-state', 'open')
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      })
      expect(drawer).toHaveAttribute('data-state', 'closed')
    })
  })
})
