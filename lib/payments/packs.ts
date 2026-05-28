/**
 * Credit packs — one-time purchases via Stripe Checkout.
 *
 * Pricing locked by amended plan §"Pricing" (R6 — credit packs only, no subscription):
 *   $4.99  →  50  credits   (best for trying premium trends)
 *   $14.99 →  200 credits   (sweet-spot value, ~$0.075/credit)
 *   $39.99 →  600 credits   (heavy creators, ~$0.067/credit)
 *
 * Margin vs Gemini Pro (`$0.024/output`): $0.075 retail = ~3x. Comfortable
 * once watermark virality + free-tier acquisition cost is netted.
 *
 * Stripe price IDs are bound at env-time (one per environment); the
 * webhook handler uses `metadata.pack_id` (our id) instead of price id
 * to stay portable across test/staging/prod.
 */

export type PackId = 'small' | 'medium' | 'large'

export interface CreditPack {
  id: PackId
  /** USD cents to match Stripe `unit_amount`. */
  priceCents: number
  credits: number
  /** Stripe `price_…` id from env. */
  priceIdEnv: string
  label: string
  perCreditCents: number
}

export const CREDIT_PACKS: ReadonlyArray<CreditPack> = [
  {
    id: 'small',
    priceCents: 499,
    credits: 50,
    priceIdEnv: 'STRIPE_PRICE_ID_SMALL',
    label: 'Starter — 50 credits',
    perCreditCents: 9.98,
  },
  {
    id: 'medium',
    priceCents: 1499,
    credits: 200,
    priceIdEnv: 'STRIPE_PRICE_ID_MEDIUM',
    label: 'Standard — 200 credits',
    perCreditCents: 7.495,
  },
  {
    id: 'large',
    priceCents: 3999,
    credits: 600,
    priceIdEnv: 'STRIPE_PRICE_ID_LARGE',
    label: 'Creator — 600 credits',
    perCreditCents: 6.665,
  },
]

export function findPack(id: PackId | string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === id) ?? null
}

export function isPackId(value: unknown): value is PackId {
  return value === 'small' || value === 'medium' || value === 'large'
}

/**
 * Resolves the Stripe price id from env for the given pack.
 * Throws when the env var is not set so misconfigured deploys fail loud at first checkout.
 */
export function requirePackPriceId(pack: CreditPack): string {
  const id = process.env[pack.priceIdEnv]
  if (!id) {
    throw new Error(
      `${pack.priceIdEnv} is not set — create the Stripe product + price for "${pack.label}" and fill the env.`
    )
  }
  return id
}
