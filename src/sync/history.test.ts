import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { pushSample, pushTorrentSamples, type Sample } from './history'

const s = (t: number, dl = 0, up = 0): Sample => ({ t, dl, up })
const tor = (dlspeed: number, upspeed = 0) => ({ dlspeed, upspeed }) as Torrent

describe('pushSample', () => {
  it('appends and caps length', () => {
    let h: readonly Sample[] = []
    for (let i = 0; i < 5; i++) h = pushSample(h, s(i, i), 3)
    expect(h.map((x) => x.t)).toEqual([2, 3, 4])
  })
})

describe('pushTorrentSamples', () => {
  it('starts tracking active torrents only', () => {
    const m = pushTorrentSamples(new Map(), new Map([['a', tor(5)], ['b', tor(0)]]), 1)
    expect([...m.keys()]).toEqual(['a'])
  })
  it('keeps tracking while any sample in the window is non-zero, then drops', () => {
    let m = pushTorrentSamples(new Map(), new Map([['a', tor(5)]]), 1, { length: 2 })
    m = pushTorrentSamples(m, new Map([['a', tor(0)]]), 2, { length: 2 })
    expect(m.get('a')?.length).toBe(2)
    m = pushTorrentSamples(m, new Map([['a', tor(0)]]), 3, { length: 2 })
    expect(m.has('a')).toBe(false)
  })
  it('drops removed torrents and respects the tracking cap', () => {
    let m = pushTorrentSamples(new Map(), new Map([['a', tor(1)], ['b', tor(1)], ['c', tor(1)]]), 1, { maxTracked: 2 })
    expect(m.size).toBe(2)
    m = pushTorrentSamples(m, new Map([['c', tor(1)]]), 2, { maxTracked: 2 })
    expect([...m.keys()]).toEqual(['c'])
  })
  it('returns the same empty map when nothing is active', () => {
    const empty = new Map()
    expect(pushTorrentSamples(empty, new Map([['a', tor(0)]]), 1)).toBe(empty)
  })
})
