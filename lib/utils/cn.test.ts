import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('dedupes Tailwind conflicts via twMerge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('skips falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
})
