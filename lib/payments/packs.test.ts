import { describe, expect, it } from 'vitest'
import { CREDIT_PACKS, findPack, isPackId, requirePackPriceId } from './packs'

describe('CREDIT_PACKS', () => {
  it('exposes three packs in ascending price order', () => {
    expect(CREDIT_PACKS).toHaveLength(3)
    expect(CREDIT_PACKS[0].priceCents).toBeLessThan(CREDIT_PACKS[1].priceCents)
    expect(CREDIT_PACKS[1].priceCents).toBeLessThan(CREDIT_PACKS[2].priceCents)
  })

  it('per-credit price drops as pack size grows (volume discount)', () => {
    expect(CREDIT_PACKS[0].perCreditCents).toBeGreaterThan(CREDIT_PACKS[1].perCreditCents)
    expect(CREDIT_PACKS[1].perCreditCents).toBeGreaterThan(CREDIT_PACKS[2].perCreditCents)
  })

  it('matches amended plan prices ($4.99 / $14.99 / $39.99)', () => {
    expect(CREDIT_PACKS.map((p) => p.priceCents)).toEqual([499, 1499, 3999])
    expect(CREDIT_PACKS.map((p) => p.credits)).toEqual([50, 200, 600])
  })
})

describe('findPack', () => {
  it('resolves by id', () => {
    expect(findPack('small')?.credits).toBe(50)
    expect(findPack('medium')?.credits).toBe(200)
    expect(findPack('large')?.credits).toBe(600)
  })

  it('returns null on unknown id', () => {
    expect(findPack('xl')).toBeNull()
  })
})

describe('isPackId', () => {
  it('accepts the three known ids', () => {
    expect(isPackId('small')).toBe(true)
    expect(isPackId('medium')).toBe(true)
    expect(isPackId('large')).toBe(true)
  })

  it('rejects other values', () => {
    expect(isPackId('xl')).toBe(false)
    expect(isPackId(0)).toBe(false)
    expect(isPackId(null)).toBe(false)
    expect(isPackId(undefined)).toBe(false)
  })
})

describe('requirePackPriceId', () => {
  it('returns env value when present', () => {
    process.env.STRIPE_PRICE_ID_SMALL = 'price_test_abc'
    try {
      expect(requirePackPriceId(CREDIT_PACKS[0])).toBe('price_test_abc')
    } finally {
      delete process.env.STRIPE_PRICE_ID_SMALL
    }
  })

  it('throws when env value missing', () => {
    delete process.env.STRIPE_PRICE_ID_SMALL
    expect(() => requirePackPriceId(CREDIT_PACKS[0])).toThrow(/STRIPE_PRICE_ID_SMALL/)
  })
})
