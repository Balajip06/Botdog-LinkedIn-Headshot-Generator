import { afterEach, describe, expect, it } from 'vitest'
import { BOTDOG_PLAN, isSubscriptionPlanId, requireSubPriceId } from './subscription'

describe('isSubscriptionPlanId', () => {
  it('accepts the Botdog plan id', () => {
    expect(isSubscriptionPlanId('botdog_monthly')).toBe(true)
    expect(isSubscriptionPlanId(BOTDOG_PLAN.id)).toBe(true)
  })

  it('rejects pack ids and junk', () => {
    expect(isSubscriptionPlanId('medium')).toBe(false)
    expect(isSubscriptionPlanId('')).toBe(false)
    expect(isSubscriptionPlanId(undefined)).toBe(false)
    expect(isSubscriptionPlanId(42)).toBe(false)
  })
})

describe('requireSubPriceId', () => {
  const original = process.env.STRIPE_PRICE_ID_SUB_MONTHLY
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_PRICE_ID_SUB_MONTHLY
    else process.env.STRIPE_PRICE_ID_SUB_MONTHLY = original
  })

  it('returns the env price id when set', () => {
    process.env.STRIPE_PRICE_ID_SUB_MONTHLY = 'price_test_123'
    expect(requireSubPriceId()).toBe('price_test_123')
  })

  it('throws a descriptive error when unset', () => {
    delete process.env.STRIPE_PRICE_ID_SUB_MONTHLY
    expect(() => requireSubPriceId()).toThrow(/STRIPE_PRICE_ID_SUB_MONTHLY/)
  })
})
