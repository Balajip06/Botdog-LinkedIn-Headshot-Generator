/**
 * MOCK_TRENDS dev-mode fixtures.
 *
 * Gated on `process.env.MOCK_TRENDS === 'true'`. When enabled, repository +
 * auth-gated RSC pages short-circuit to in-memory fixtures so the consumer flow
 * can be screenshot-tested without Supabase Docker, Gemini, or any external
 * dependency.
 *
 * Single-purpose Botdog build: the only trend is the LinkedIn headshot, with a
 * profession `style` picker. Prompt/styles/schema/FAQ come from
 * `lib/trends/headshot.ts` so MOCK and the real seed never drift.
 *
 * Production behavior unchanged when flag absent.
 */
import type { PublicTrend } from '@/lib/trends/repository'
import {
  HEADSHOT_FAQ,
  HEADSHOT_INPUT_SCHEMA,
  HEADSHOT_SEO,
} from '@/lib/trends/headshot'

export const MOCK_TRENDS_ENABLED = process.env.MOCK_TRENDS === 'true'

const ISO_NOW = '2026-06-05T12:00:00.000Z'
const ISO_RECENT = '2026-05-28T12:00:00.000Z'

export const MOCK_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@botdog.dev',
}

export const MOCK_PROFILE = {
  email: MOCK_USER.email,
  credits_balance: 42,
  free_used_this_week: 2,
  referral_code: 'a1b2c3d4e5f6',
  bonus_credits_earned: 10,
}

const HEADSHOT_ID = '11111111-1111-4111-8111-111111111111'
const HEADSHOT_THUMB = '/thumbnails/linkedin-headshot.webp'

export const MOCK_TRENDS: PublicTrend[] = [
  {
    id: HEADSHOT_ID,
    slug: 'linkedin-headshot',
    title: 'AI LinkedIn Headshot Generator',
    description:
      'Turn any selfie into a professional, studio-quality LinkedIn headshot — your real face, a sharp outfit, and a believable workplace background.',
    thumbnail_url: HEADSHOT_THUMB,
    sample_before_url: null,
    sample_after_url: HEADSHOT_THUMB,
    aspect_ratio: '1:1',
    model: 'nano-banana',
    input_schema: HEADSHOT_INPUT_SCHEMA,
    seo_title: HEADSHOT_SEO.title,
    seo_description: HEADSHOT_SEO.description,
    faq: HEADSHOT_FAQ.map((f) => ({ ...f })),
    display_order: 0,
    updated_at: ISO_NOW,
    activated_at: ISO_RECENT,
  },
]

export type MockGenerationStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'failed_retryable'

export interface MockGeneration {
  id: string
  user_id: string
  trend_id: string
  status: MockGenerationStatus
  output_image_url: string | null
  error_message: string | null
  attempts: number
  idempotency_key: string
  created_at: string
  cost_usd: number
  completed_at: string | null
  purge_at: string | null
}

export const MOCK_GENERATIONS: MockGeneration[] = [
  {
    id: 'mock-completed',
    user_id: MOCK_USER.id,
    trend_id: HEADSHOT_ID,
    status: 'completed',
    output_image_url: '/mock/sample-1.jpg',
    error_message: null,
    attempts: 1,
    idempotency_key: 'mock-key-completed',
    created_at: ISO_NOW,
    cost_usd: 0.0039,
    completed_at: ISO_NOW,
    purge_at: null,
  },
  {
    id: 'mock-processing',
    user_id: MOCK_USER.id,
    trend_id: HEADSHOT_ID,
    status: 'processing',
    output_image_url: null,
    error_message: null,
    attempts: 1,
    idempotency_key: 'mock-key-processing',
    created_at: ISO_NOW,
    cost_usd: 0,
    completed_at: null,
    purge_at: null,
  },
  {
    id: 'mock-retryable',
    user_id: MOCK_USER.id,
    trend_id: HEADSHOT_ID,
    status: 'failed_retryable',
    output_image_url: null,
    error_message: 'Transient upstream timeout. Retry available.',
    attempts: 2,
    idempotency_key: 'mock-key-retryable',
    created_at: ISO_NOW,
    cost_usd: 0,
    completed_at: null,
    purge_at: null,
  },
  {
    id: 'mock-failed',
    user_id: MOCK_USER.id,
    trend_id: HEADSHOT_ID,
    status: 'failed',
    output_image_url: null,
    error_message: 'Output rejected by safety filter. No credit charged.',
    attempts: 3,
    idempotency_key: 'mock-key-failed',
    created_at: ISO_NOW,
    cost_usd: 0,
    completed_at: null,
    purge_at: null,
  },
]

export function findMockGeneration(id: string): MockGeneration | null {
  return MOCK_GENERATIONS.find((g) => g.id === id) ?? null
}

export function findMockTrendById(id: string): PublicTrend | null {
  return MOCK_TRENDS.find((t) => t.id === id) ?? null
}
