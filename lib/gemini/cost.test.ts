import { describe, expect, it } from 'vitest'
import { costForOutput, isAnonymousBudgetExceeded } from './cost'

describe('costForOutput', () => {
  it('returns Pro cost higher than v1', () => {
    expect(costForOutput('nano-banana-pro')).toBeGreaterThan(costForOutput('nano-banana'))
  })

  it('returns finite positive USD value for both models', () => {
    expect(costForOutput('nano-banana')).toBeGreaterThan(0)
    expect(costForOutput('nano-banana-pro')).toBeGreaterThan(0)
    expect(Number.isFinite(costForOutput('nano-banana'))).toBe(true)
  })
})

describe('isAnonymousBudgetExceeded', () => {
  it('returns false when spent < cap', () => {
    expect(isAnonymousBudgetExceeded(5, 20)).toBe(false)
  })

  it('returns true when spent equals cap', () => {
    expect(isAnonymousBudgetExceeded(20, 20)).toBe(true)
  })

  it('returns true when spent exceeds cap', () => {
    expect(isAnonymousBudgetExceeded(25, 20)).toBe(true)
  })
})
