import { afterEach, beforeEach, describe, expect, it } from 'vitest'

interface Counts {
  impressions: number
  clicks: number
}

declare global {
  var __trendEventStore: Map<string, Counts> | undefined
}

async function loadFresh() {
  // The store hangs off globalThis so it can survive Next's per-route module
  // re-eval. Clearing the global + the Vitest module cache gives each test a
  // pristine baseline. The memory backend is the default (no
  // `TREND_EVENTS_BACKEND=supabase` env) — tests target it directly.
  globalThis.__trendEventStore = undefined
  delete process.env.TREND_EVENTS_BACKEND
  const mod = await import('./event-store')
  return mod
}

beforeEach(() => {
  globalThis.__trendEventStore = undefined
  delete process.env.TREND_EVENTS_BACKEND
})

afterEach(() => {
  globalThis.__trendEventStore = undefined
  delete process.env.TREND_EVENTS_BACKEND
})

describe('event-store baseline', () => {
  it('returns a non-zero deterministic count for a given slug', async () => {
    const { getCounts } = await loadFresh()
    const a = await getCounts('ghibli-portrait')
    expect(a.impressions).toBeGreaterThan(0)
    expect(a.clicks).toBeGreaterThanOrEqual(0)
  })

  it('is deterministic — same slug yields same baseline across loads', async () => {
    const first = await loadFresh()
    const a = await first.getCounts('ghibli-portrait')
    const second = await loadFresh()
    const b = await second.getCounts('ghibli-portrait')
    expect(b).toEqual(a)
  })

  it('different slugs yield different baselines', async () => {
    const { getCounts } = await loadFresh()
    const a = await getCounts('ghibli-portrait')
    const b = await getCounts('cyberpunk-neon')
    expect(a.impressions).not.toEqual(b.impressions)
  })

  it('CTR for any baseline is between 6% and 24%', async () => {
    const { getCounts } = await loadFresh()
    for (const slug of [
      'ghibli-portrait',
      'anime-portrait',
      'lego-minifigure',
      'y2k-digicam-flash',
    ]) {
      const c = await getCounts(slug)
      const ctr = c.clicks / c.impressions
      expect(ctr).toBeGreaterThanOrEqual(0.06)
      expect(ctr).toBeLessThanOrEqual(0.24)
    }
  })
})

describe('recordEvent', () => {
  it('increments impressions by exactly 1', async () => {
    const { getCounts, recordEvent } = await loadFresh()
    const before = (await getCounts('test-slug')).impressions
    await recordEvent('test-slug', 'impression')
    expect((await getCounts('test-slug')).impressions).toBe(before + 1)
  })

  it('increments clicks by exactly 1', async () => {
    const { getCounts, recordEvent } = await loadFresh()
    const before = (await getCounts('test-slug')).clicks
    await recordEvent('test-slug', 'click_generate')
    expect((await getCounts('test-slug')).clicks).toBe(before + 1)
  })

  it('records do not leak across slugs', async () => {
    const { getCounts, recordEvent } = await loadFresh()
    const otherBefore = await getCounts('other-slug')
    await recordEvent('test-slug', 'impression')
    expect(await getCounts('other-slug')).toEqual(otherBefore)
  })
})

describe('getCountsBatch', () => {
  it('returns a Map keyed on each requested slug', async () => {
    const { getCountsBatch } = await loadFresh()
    const slugs = ['a', 'b', 'c']
    const map = await getCountsBatch(slugs)
    expect(map.size).toBe(3)
    for (const s of slugs) {
      expect(map.has(s)).toBe(true)
    }
  })

  it('returns the same counts as getCounts for each slug', async () => {
    const { getCounts, getCountsBatch } = await loadFresh()
    const slugs = ['x', 'y']
    const map = await getCountsBatch(slugs)
    expect(map.get('x')).toEqual(await getCounts('x'))
    expect(map.get('y')).toEqual(await getCounts('y'))
  })
})

describe('getOverall', () => {
  it('sums impressions + clicks across all requested slugs', async () => {
    const { getCounts, getOverall } = await loadFresh()
    const slugs = ['one', 'two', 'three']
    const counts = await Promise.all(slugs.map((s) => getCounts(s)))
    const expected = counts.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
      }),
      { impressions: 0, clicks: 0 }
    )
    expect(await getOverall(slugs)).toEqual(expected)
  })

  it('returns zeros for empty input', async () => {
    const { getOverall } = await loadFresh()
    expect(await getOverall([])).toEqual({ impressions: 0, clicks: 0 })
  })

  it('reflects recorded events', async () => {
    const { getOverall, recordEvent } = await loadFresh()
    const before = await getOverall(['a', 'b'])
    await recordEvent('a', 'impression')
    await recordEvent('b', 'click_generate')
    const after = await getOverall(['a', 'b'])
    expect(after.impressions).toBe(before.impressions + 1)
    expect(after.clicks).toBe(before.clicks + 1)
  })
})

describe('globalThis persistence', () => {
  it('shares state across module loads in the same process', async () => {
    delete process.env.TREND_EVENTS_BACKEND
    globalThis.__trendEventStore = undefined
    const first = await import('./event-store')
    await first.recordEvent('shared-slug', 'impression')
    const before = (await first.getCounts('shared-slug')).impressions

    // Force a re-import — should rebind to the same globalThis store.
    const second = await import('./event-store')
    expect((await second.getCounts('shared-slug')).impressions).toBe(before)
  })
})

describe('backend selection', () => {
  it('uses the memory backend when TREND_EVENTS_BACKEND is unset', async () => {
    delete process.env.TREND_EVENTS_BACKEND
    const { getCounts } = await loadFresh()
    const a = await getCounts('backend-test-slug')
    // Memory baseline is non-zero by construction. DB backend would
    // return zeros for an empty table.
    expect(a.impressions).toBeGreaterThan(0)
  })
})
