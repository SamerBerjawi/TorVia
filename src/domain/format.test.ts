import { describe, expect, it } from 'vitest'
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed } from './format'
import { toStatus } from './status'

describe('format', () => {
  it('bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KiB')
    expect(formatBytes(-1)).toBe('—')
  })
  it('speed', () => {
    expect(formatSpeed(0)).toBe('—')
    expect(formatSpeed(1048576)).toBe('1.0 MiB/s')
  })
  it('eta treats 8640000 as infinity', () => {
    expect(formatEta(8_640_000)).toBe('∞')
    expect(formatEta(75)).toBe('1m 15s')
    expect(formatEta(3 * 3600 + 120)).toBe('3h 2m')
  })
  it('percent floors so 99.99% never shows as 100%', () => {
    expect(formatPercent(0.9999)).toBe('99.9%')
    expect(formatPercent(1)).toBe('100%')
  })
  it('ratio', () => {
    expect(formatRatio(-1)).toBe('—')
    expect(formatRatio(1.234)).toBe('1.23')
  })
})

describe('status mapping', () => {
  it('accepts both pre-5.0 paused* and 5.x stopped* states', () => {
    expect(toStatus('pausedUP')).toBe('completed')
    expect(toStatus('stoppedUP')).toBe('completed')
    expect(toStatus('pausedDL')).toBe('stopped')
    expect(toStatus('stoppedDL')).toBe('stopped')
  })
  it('falls back to unknown', () => expect(toStatus('somethingNew')).toBe('unknown'))
})
