import { describe, expect, it } from 'vitest'
import { clampPaneHeight, clampSideWidth, PANE_DEFAULT, PANE_MIN, parseStoredHeight, parseStoredWidth, SIDE_DEFAULT, SIDE_MIN } from './pane'

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

describe('side pane width', () => {
  it('clamps between the minimum and what leaves room for the rest', () => {
    expect(clampSideWidth(100, 1400)).toBe(SIDE_MIN)
    expect(clampSideWidth(2000, 1400)).toBe(920)
    expect(clampSideWidth(500, 1400)).toBe(500)
  })
  it('honours a custom reserve (Graphite also has a sidebar)', () => {
    expect(clampSideWidth(2000, 1400, 600)).toBe(800)
  })
  it('never goes below the minimum in a narrow window, and falls back for junk', () => {
    expect(clampSideWidth(500, 500)).toBe(SIDE_MIN)
    expect(clampSideWidth(Number.NaN, 1400)).toBe(SIDE_DEFAULT)
  })
  it('parses stored widths defensively', () => {
    expect(parseStoredWidth('420')).toBe(420)
    expect(parseStoredWidth(null)).toBe(SIDE_DEFAULT)
    expect(parseStoredWidth('100')).toBe(SIDE_DEFAULT)
    expect(parseStoredWidth('x')).toBe(SIDE_DEFAULT)
  })
})
