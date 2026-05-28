import { describe, it, expectTypeOf } from 'vitest'
import type { TablesInsert, TablesUpdate } from './database.types'

/**
 * Type-level smoke tests for generated Supabase Database types.
 *
 * Locks in the per-table Insert/Update shapes so that if
 * `pnpm supabase:types` is ever regenerated and a required column is
 * dropped, renamed, or its type changes, this file fails at compile
 * time before any runtime regression reaches production.
 *
 * No runtime assertions — `expectTypeOf` is a compile-time check that
 * Vitest still surfaces as a passing test.
 */
describe('Database types smoke', () => {
  it('profiles insert requires id + email', () => {
    expectTypeOf<TablesInsert<'profiles'>>().toHaveProperty('id').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'profiles'>>().toHaveProperty('email').toEqualTypeOf<string>()
    expectTypeOf<TablesUpdate<'profiles'>>().toHaveProperty('deleted_at')
  })

  it('trends insert requires slug + title + prompt_template', () => {
    expectTypeOf<TablesInsert<'trends'>>().toHaveProperty('slug').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'trends'>>().toHaveProperty('title').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'trends'>>().toHaveProperty('prompt_template').toEqualTypeOf<string>()
    expectTypeOf<TablesUpdate<'trends'>>().toHaveProperty('is_active')
    expectTypeOf<TablesUpdate<'trends'>>().toHaveProperty('eval_status')
  })

  it('generations insert requires user_id + trend_id + idempotency_key + input_payload + trend_version', () => {
    expectTypeOf<TablesInsert<'generations'>>().toHaveProperty('user_id').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'generations'>>().toHaveProperty('trend_id').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'generations'>>()
      .toHaveProperty('idempotency_key')
      .toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'generations'>>().toHaveProperty('input_payload')
    expectTypeOf<TablesInsert<'generations'>>()
      .toHaveProperty('trend_version')
      .toEqualTypeOf<number>()
  })

  it('referrals insert requires referrer_id + referred_id', () => {
    expectTypeOf<TablesInsert<'referrals'>>().toHaveProperty('referrer_id').toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'referrals'>>().toHaveProperty('referred_id').toEqualTypeOf<string>()
    expectTypeOf<TablesUpdate<'referrals'>>().toHaveProperty('status')
    expectTypeOf<TablesUpdate<'referrals'>>().toHaveProperty('rewarded_at')
  })

  it('admin_audit_log insert requires action + target_table', () => {
    expectTypeOf<TablesInsert<'admin_audit_log'>>()
      .toHaveProperty('action')
      .toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'admin_audit_log'>>()
      .toHaveProperty('target_table')
      .toEqualTypeOf<string>()
    expectTypeOf<TablesInsert<'admin_audit_log'>>().toHaveProperty('before')
    expectTypeOf<TablesInsert<'admin_audit_log'>>().toHaveProperty('after')
  })
})
