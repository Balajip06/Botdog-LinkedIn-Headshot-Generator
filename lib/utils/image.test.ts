import { describe, expect, it } from 'vitest'
import { scaleToFit } from './image'

describe('scaleToFit', () => {
  it('passes through dims smaller than max', () => {
    expect(scaleToFit(1000, 800, 2048)).toEqual({ width: 1000, height: 800 })
  })

  it('scales landscape by width', () => {
    expect(scaleToFit(4000, 2000, 2048)).toEqual({ width: 2048, height: 1024 })
  })

  it('scales portrait by height', () => {
    expect(scaleToFit(2000, 4000, 2048)).toEqual({ width: 1024, height: 2048 })
  })

  it('handles square at exactly max', () => {
    expect(scaleToFit(2048, 2048, 2048)).toEqual({ width: 2048, height: 2048 })
  })

  it('handles square above max', () => {
    expect(scaleToFit(4096, 4096, 2048)).toEqual({ width: 2048, height: 2048 })
  })
})
