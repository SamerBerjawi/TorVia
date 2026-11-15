import { describe, expect, it } from 'vitest'
import { parseRate, splitRate } from './rate'

describe('rate', () => {
  it('parses text in the chosen unit', () => {
    expect(parseRate('500', 'KiB/s')).toBe(512000)
    expect(parseRate('1.5', 'MiB/s')).toBe(1572864)
    expect(parseRate('1,5', 'MiB/s')).toBe(1572864)
  })
  it('treats empty as unlimited and rejects junk', () => {
    expect(parseRate('  ', 'KiB/s')).toBe(0)
    expect(parseRate('-3', 'KiB/s')).toBeNull()
    expect(parseRate('abc', 'KiB/s')).toBeNull()
    expect(parseRate('1e3', 'KiB/s')).toBeNull()
  })
  it('splits bytes into the friendliest unit', () => {
    expect(splitRate(0)).toEqual({ text: '', unit: 'KiB/s' })
    expect(splitRate(5 * 1024 * 1024)).toEqual({ text: '5', unit: 'MiB/s' })
    expect(splitRate(768 * 1024)).toEqual({ text: '768', unit: 'KiB/s' })
    expect(splitRate(1536)).toEqual({ text: '1.5', unit: 'KiB/s' })
  })
  it('round-trips', () => {
    for (const b of [1024, 512000, 3 * 1024 * 1024, 1500]) {
      const { text, unit } = splitRate(b)
      expect(parseRate(text, unit)).toBe(b)
    }
  })
})
