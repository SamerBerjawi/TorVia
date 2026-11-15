import { describe, expect, it } from 'vitest'
import { diffPrefs, FIELDS, fromDisplay, isActive, toDisplay, validateField, visibleFields } from './settingsSchema'

const field = (key: string) => FIELDS.find((f) => f.key === key)!

describe('settings schema', () => {
  it('has unique keys and never exposes lock-out settings', () => {
    const keys = FIELDS.map((f) => f.key)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.filter((k) => k.startsWith('web_ui') || k === 'bypass_local_auth')).toEqual([])
  })
  it('hides fields the server does not report', () => {
    const f = visibleFields({ save_path: '/d', dht: true })
    expect(f.map((x) => x.key)).toEqual(['save_path', 'dht'])
  })
  it('searches label, help, keywords and section', () => {
    const prefs = Object.fromEntries(FIELDS.map((f) => [f.key, 0]))
    expect(visibleFields(prefs, 'turtle').map((f) => f.key)).toEqual(['alt_dl_limit', 'alt_up_limit'])
    expect(visibleFields(prefs, 'queueing max').length).toBeGreaterThan(2)
    expect(visibleFields(prefs, 'zzzz')).toEqual([])
  })
  it('diffs only changed keys', () => {
    expect(diffPrefs({ a: 1, b: true, c: 'x' }, { a: 1, b: false, c: 'x' })).toEqual({ b: false })
  })
  it('validates numbers and ranges', () => {
    expect(validateField(field('listen_port'), 70000)).toBe('At most 65535')
    expect(validateField(field('listen_port'), 1.5)).toBe('Enter a whole number')
    expect(validateField(field('listen_port'), Number.NaN)).toBe('Enter a number')
    expect(validateField(field('listen_port'), 6881)).toBeNull()
    expect(validateField(field('max_ratio'), 1.5)).toBeNull()
    expect(validateField(field('save_path'), ' ')).toBe('Required')
  })
  it('converts rate fields between KiB/s and bytes/s', () => {
    expect(toDisplay(field('dl_limit'), 2048)).toBe(2)
    expect(fromDisplay(field('dl_limit'), 2)).toBe(2048)
    expect(toDisplay(field('listen_port'), 6881)).toBe(6881)
  })
  it('deactivates dependents when their toggle is off', () => {
    expect(isActive(field('temp_path'), { temp_path_enabled: false })).toBe(false)
    expect(isActive(field('temp_path'), { temp_path_enabled: true })).toBe(true)
    expect(isActive(field('save_path'), {})).toBe(true)
  })
})
