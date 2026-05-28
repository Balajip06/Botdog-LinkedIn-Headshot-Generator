'use client'

import Script from 'next/script'
import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
  /** Called whenever Turnstile produces (or refreshes) a token. */
  onToken: (token: string) => void
  /** Cloudflare Turnstile site key (NEXT_PUBLIC_TURNSTILE_SITE_KEY). */
  siteKey?: string
  /** 'auto' | 'light' | 'dark' — default 'auto'. */
  theme?: 'auto' | 'light' | 'dark'
}

interface TurnstileGlobal {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      theme?: 'auto' | 'light' | 'dark'
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    }
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export function TurnstileWidget({ onToken, siteKey, theme = 'auto' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  const resolvedKey = siteKey ?? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!resolvedKey) return
    let mounted = true

    const tryRender = () => {
      if (!mounted) return
      const ts = window.turnstile
      const container = containerRef.current
      if (!ts || !container || widgetIdRef.current) return
      widgetIdRef.current = ts.render(container, {
        sitekey: resolvedKey,
        theme,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }

    tryRender()
    const interval = window.setInterval(tryRender, 250)
    return () => {
      mounted = false
      window.clearInterval(interval)
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onToken, resolvedKey, theme])

  // No key configured (dev/preview): caller's server action will short-circuit
  // verifyTurnstile to true, so we just emit a placeholder token so the
  // submit button stays enabled.
  useEffect(() => {
    if (!resolvedKey) onToken('dev')
  }, [onToken, resolvedKey])

  if (!resolvedKey) return null

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" />
      <div ref={containerRef} />
    </>
  )
}
