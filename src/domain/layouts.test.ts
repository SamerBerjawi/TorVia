import { describe, expect, it } from 'vitest'
import { layoutsFor, parseLayouts, removeLayout, upsertLayout, type Layout } from './layouts'

const L = (name: string, skin = 'graphite', over: Partial<Layout> = {}): Layout => ({ name, skin, columns: undefined, sort: { key: 'name', dir: 'asc' }, density: 'comfortable', ...over })

describe('layouts', () => {
  it('replaces a layout saved under the same name (case-insensitive, same skin only)', () => {
    const a = upsertLayout([L('Work'), L('Work', 'paper')], L('work', 'graphite', { density: 'compact' }))
    expect(a).toHaveLength(2)
    expect(a.find((l) => l.skin === 'graphite')?.density).toBe('compact')
  })
  it('removes by skin and name', () => {
    expect(removeLayout([L('a'), L('a', 'paper')], 'graphite', 'a').map((l) => l.skin)).toEqual(['paper'])
  })
  it('lists a skin’s layouts alphabetically', () => {
    expect(layoutsFor([L('b'), L('a'), L('z', 'paper')], 'graphite').map((l) => l.name)).toEqual(['a', 'b'])
  })
  it('round-trips through JSON', () => {
    const l = L('x', 'signal', { columns: { order: ['name'], visible: ['name'] }, sort: { key: 'size', dir: 'desc' }, density: 'spacious' })
    expect(parseLayouts(JSON.parse(JSON.stringify([l])))).toEqual([l])
  })
  it('drops malformed entries instead of trusting them', () => {
    const bad = [null, 3, { name: '', skin: 'x' }, { ...L('ok') }, { ...L('k1'), sort: { key: 'nope', dir: 'asc' } }, { ...L('k2'), density: 'huge' }, { ...L('k3'), columns: { order: [1], visible: [] } }]
    expect(parseLayouts(bad).map((l) => l.name)).toEqual(['ok'])
    expect(parseLayouts('junk')).toEqual([])
  })
})
