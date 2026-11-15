import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { findCompleted } from './completions'

const t = (name: string, progress: number) => ({ name, progress }) as Torrent
const m = (...e: [string, Torrent][]) => new Map(e)

describe('findCompleted', () => {
  it('reports torrents that crossed 100%', () => {
    expect(findCompleted(m(['a', t('A', 0.9)], ['b', t('B', 0.2)]), m(['a', t('A', 1)], ['b', t('B', 0.4)]))).toEqual(['A'])
  })
  it('ignores torrents first seen complete and ones that were already complete', () => {
    expect(findCompleted(m(['a', t('A', 1)]), m(['a', t('A', 1)], ['n', t('N', 1)]))).toEqual([])
  })
  it('ignores removals and empty maps', () => {
    expect(findCompleted(m(['a', t('A', 0.5)]), m())).toEqual([])
    expect(findCompleted(m(), m())).toEqual([])
  })
})
