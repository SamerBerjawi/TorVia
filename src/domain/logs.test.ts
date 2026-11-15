import { describe, expect, it } from 'vitest'
import type { LogEntry } from '@/api/logs'
import { filterLog, levelName, logToText, mergeLog } from './logs'

const e = (id: number, type = 2, message = `m${id}`): LogEntry => ({ id, message, timestamp: 1_700_000_000_000 + id, type })

describe('log helpers', () => {
  it('appends only unseen entries and returns the same array when nothing is new', () => {
    const a = [e(1), e(2)]
    expect(mergeLog(a, [e(2), e(3)]).map((x) => x.id)).toEqual([1, 2, 3])
    expect(mergeLog(a, [e(1), e(2)])).toBe(a)
  })
  it('caps to the newest entries', () => {
    expect(mergeLog([e(1), e(2), e(3)], [e(4)], 3).map((x) => x.id)).toEqual([2, 3, 4])
  })
  it('maps wire types to levels', () => {
    expect([1, 2, 4, 8].map(levelName)).toEqual(['normal', 'info', 'warning', 'critical'])
  })
  it('filters by level and text', () => {
    const list = [e(1, 1, 'Started'), e(2, 4, 'Peer banned'), e(3, 8, 'Disk full')]
    expect(filterLog(list, new Set(['warning', 'critical']), '').map((x) => x.id)).toEqual([2, 3])
    expect(filterLog(list, new Set(['warning', 'critical', 'normal', 'info']), 'DISK').map((x) => x.id)).toEqual([3])
  })
  it('exports text', () => {
    expect(logToText([e(1, 4, 'x')])).toBe('2023-11-14T22:13:20.001Z [warning] x')
  })
})
