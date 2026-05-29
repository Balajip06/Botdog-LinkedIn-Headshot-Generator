/**
 * Mock fixtures for the anonymous-trial flow.
 *
 * The real path (Turnstile gate + fingerprint dedupe + /api/generate-anonymous)
 * is wired but inert without those creds. These fixtures let the UI render the
 * full flow end-to-end against deterministic data so the surface is reviewable
 * pre-launch. When real creds land, swap `findMockAnonymousGeneration` callers
 * for a Supabase query against `anonymous_attempts`.
 */

import { MOCK_TRENDS } from './mock-data'

const ONE_HOUR_MS = 3_600_000
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS

const NOW = new Date('2026-05-29T11:00:00.000Z').getTime()
const CREATED_AT = new Date(NOW - 3 * ONE_HOUR_MS).toISOString()
const EXPIRES_AT = new Date(NOW - 3 * ONE_HOUR_MS + TWENTY_FOUR_HOURS_MS).toISOString()

export interface MockAnonymousGeneration {
  id: string
  trend_slug: string
  trend_title: string
  output_image_url: string
  created_at: string
  expires_at: string
}

export const MOCK_ANONYMOUS_GENERATIONS: MockAnonymousGeneration[] = [
  {
    id: 'demo',
    trend_slug: MOCK_TRENDS[0].slug,
    trend_title: MOCK_TRENDS[0].title,
    output_image_url: '/mock/sample-1.svg',
    created_at: CREATED_AT,
    expires_at: EXPIRES_AT,
  },
]

export function findMockAnonymousGeneration(id: string): MockAnonymousGeneration | null {
  return MOCK_ANONYMOUS_GENERATIONS.find((g) => g.id === id) ?? null
}
