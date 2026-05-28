/**
 * Client-side analytics façade. Wraps posthog-js behind a singleton so call
 * sites don't import the SDK directly; that keeps the SDK tree-shake-able
 * out of bundles where it isn't bound and gives us a no-op fallback when
 * NEXT_PUBLIC_POSTHOG_KEY is missing (dev / preview).
 *
 * Bound once by components/analytics/PostHogProvider after posthog.init().
 */

import { EVENTS, type EventName, type PayloadByEvent } from './events'

interface PosthogLike {
  capture: (event: string, properties?: Record<string, unknown>) => void
  identify: (distinctId: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

let bound: PosthogLike | null = null

export function bindAnalytics(instance: PosthogLike): void {
  bound = instance
}

export function unbindAnalytics(): void {
  bound = null
}

export const analytics = {
  /** Type-safe wrapper: payload shape is checked against the event name. */
  track<E extends EventName>(event: E, payload: PayloadByEvent[E]): void {
    bound?.capture(event, payload as Record<string, unknown>)
  },
  /** Identify on login (call from auth callback flow once we wire server signals). */
  identify(distinctId: string, properties?: Record<string, unknown>): void {
    bound?.identify(distinctId, properties)
  },
  /** Reset on logout to avoid cross-account contamination. */
  reset(): void {
    bound?.reset()
  },
}

export { EVENTS }
