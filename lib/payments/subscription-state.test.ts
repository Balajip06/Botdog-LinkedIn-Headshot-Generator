import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { mapStripeStatus, setSubscriptionState } from './subscription-state'

describe('mapStripeStatus', () => {
  it('maps active/trialing to active', () => {
    expect(mapStripeStatus('active')).toBe('active')
    expect(mapStripeStatus('trialing')).toBe('active')
  })

  it('maps past_due/unpaid/incomplete to past_due', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due')
    expect(mapStripeStatus('unpaid')).toBe('past_due')
    expect(mapStripeStatus('incomplete')).toBe('past_due')
  })

  it('maps canceled and unknown to canceled', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled')
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled')
    expect(mapStripeStatus('paused')).toBe('canceled')
    expect(mapStripeStatus('anything-else')).toBe('canceled')
  })
})

describe('setSubscriptionState', () => {
  it('calls the RPC with mapped args and returns ok', async () => {
    const rpc = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = { rpc } as unknown as SupabaseClient
    const res = await setSubscriptionState(supabase, {
      userId: 'u1',
      status: 'active',
      periodEnd: '2099-01-01T00:00:00.000Z',
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      resetUsage: true,
    })
    expect(res.ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('set_subscription_state', {
      p_user_id: 'u1',
      p_status: 'active',
      p_period_end: '2099-01-01T00:00:00.000Z',
      p_customer_id: 'cus_1',
      p_subscription_id: 'sub_1',
      p_reset_usage: true,
    })
  })

  it('surfaces the RPC error', async () => {
    const rpc = vi.fn(() => Promise.resolve({ error: { message: 'boom' } }))
    const supabase = { rpc } as unknown as SupabaseClient
    const res = await setSubscriptionState(supabase, {
      userId: 'u1',
      status: 'canceled',
      periodEnd: null,
      customerId: null,
      subscriptionId: null,
      resetUsage: false,
    })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('boom')
  })
})
