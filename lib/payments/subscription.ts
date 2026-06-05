/**
 * The "Botdog plan" — a recurring monthly subscription via Stripe Checkout
 * (`mode: 'subscription'`). Distinct from the one-time credit packs in
 * `packs.ts`, which stay wired as backend (admin grants, referrals, top-ups).
 *
 * The plan grants a MONTHLY ALLOWANCE of generations, enforced DB-side by a
 * per-period counter (`profiles.sub_used_this_period` vs `sub_allowance`) — see
 * migration 0033. The allowance resets every billing period (webhook
 * `invoice.paid`) and never stacks. `allowance` here is the seed default for new
 * subscribers; the DB column is the runtime source of truth.
 *
 * The Stripe price id is bound at env-time (one recurring price per environment).
 */

export const BOTDOG_PLAN = {
  id: 'botdog_monthly',
  priceIdEnv: 'STRIPE_PRICE_ID_SUB_MONTHLY',
  /** USD cents — informational; the real amount lives on the Stripe price. */
  priceCents: 900,
  /** Generations included per billing period. */
  allowance: 200,
  label: 'Botdog plan — 200 headshots / month',
} as const

export type SubscriptionPlanId = typeof BOTDOG_PLAN.id

export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return value === BOTDOG_PLAN.id
}

/**
 * Resolves the recurring Stripe price id from env. Throws when unset so a
 * misconfigured deploy fails loud at first checkout (mirrors `requirePackPriceId`).
 */
export function requireSubPriceId(): string {
  const id = process.env[BOTDOG_PLAN.priceIdEnv]
  if (!id) {
    throw new Error(
      `${BOTDOG_PLAN.priceIdEnv} is not set — create the recurring Stripe price for "${BOTDOG_PLAN.label}" and fill the env.`
    )
  }
  return id
}
