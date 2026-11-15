import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { categoryStats, formatDuration, libraryTotals, ratioDistribution, statusBreakdown, topBy } from './stats'

const T = (o: Partial<Torrent>): Torrent => ({ name: 'x', state: 'downloading', progress: 0, size: 0, ratio: 0, category: '', ...o }) as Torrent

describe('stats', () => {
  it('partitions by display status (each torrent once)', () => {
    const b = statusBreakdown([T({ state: 'stalledUP' }), T({ state: 'uploading' }), T({ state: 'pausedDL' }), T({ state: 'error' })])
    expect(b).toEqual([{ status: 'seeding', count: 2 }, { status: 'stopped', count: 1 }, { status: 'error', count: 1 }])
  })
  it('aggregates categories, largest first', () => {
    const c = categoryStats([T({ category: 'a', size: 5, uploaded: 1 }), T({ category: 'b', size: 9 }), T({ category: 'a', size: 5 })])
    expect(c.map((x) => [x.category, x.count, x.size])).toEqual([['a', 2, 10], ['b', 1, 9]])
  })
  it('buckets ratios of completed torrents only', () => {
    const r = ratioDistribution([T({ progress: 1, ratio: 0.2 }), T({ progress: 1, ratio: 1 }), T({ progress: 1, ratio: 7 }), T({ progress: 0.5, ratio: 9 })])
    expect(r.map((x) => x.count)).toEqual([1, 0, 1, 0, 1])
  })
  it('top-n excludes zeros', () => {
    const top = topBy([['a', T({ upspeed: 3 })], ['b', T({ upspeed: 0 })], ['c', T({ upspeed: 9 })]], 'upspeed', 5)
    expect(top.map(([h]) => h)).toEqual(['c', 'a'])
  })
  it('totals', () => {
    expect(libraryTotals([T({ size: 10, progress: 1, uploaded: 4 }), T({ size: 6, amount_left: 3 })])).toEqual({ count: 2, size: 16, completed: 1, remaining: 3, uploaded: 4 })
  })
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(90)).toBe('1m')
    expect(formatDuration(3 * 86400 + 4 * 3600)).toBe('3d 4h')
  })
})
