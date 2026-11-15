import { describe, expect, it } from 'vitest'
import { clampPaneHeight, PANE_DEFAULT, PANE_MIN, parseStoredHeight } from './pane'

describe('pane sizing', () => {
  it('clamps between the minimum and what leaves room above', () => {
    expect(clampPaneHeight(50, 800)).toBe(PANE_MIN)
    expect(clampPaneHeight(900, 800)).toBe(640)
    expect(clampPaneHeight(400, 800)).toBe(400)
  })
  it('never goes below the minimum even in a tiny window', () => {
    expect(clampPaneHeight(500, 200)).toBe(PANE_MIN)
  })
  it('falls back for non-finite input', () => {
    expect(clampPaneHeight(Number.NaN, 800)).toBe(PANE_DEFAULT)
  })
  it('parses stored values defensively', () => {
    expect(parseStoredHeight('420')).toBe(420)
    expect(parseStoredHeight(null)).toBe(PANE_DEFAULT)
    expect(parseStoredHeight('abc')).toBe(PANE_DEFAULT)
    expect(parseStoredHeight('20')).toBe(PANE_DEFAULT)
    expect(parseStoredHeight('99999')).toBe(PANE_DEFAULT)
  })
})
