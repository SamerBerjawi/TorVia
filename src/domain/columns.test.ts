import { describe, expect, it } from 'vitest'
import { moveColumn, resolveColumns, setVisible, toPrefs, type ColumnSpec } from './columns'

const specs: ColumnSpec[] = [{ id: 'name', locked: true }, { id: 'size' }, { id: 'ratio' }, { id: 'tags', defaultHidden: true }]
const ids = (c: { id: string; visible: boolean }[]) => c.filter((x) => x.visible).map((x) => x.id)

describe('column preferences', () => {
  it('uses defaults without prefs', () => {
    expect(ids(resolveColumns(specs, undefined))).toEqual(['name', 'size', 'ratio'])
  })
  it('round-trips user choices', () => {
    const cols = moveColumn(setVisible(resolveColumns(specs, undefined), 'tags', true), 'tags', -2)
    const back = resolveColumns(specs, toPrefs(cols))
    expect(back.map((c) => c.id)).toEqual(['name', 'tags', 'size', 'ratio'])
    expect(ids(back)).toEqual(['name', 'tags', 'size', 'ratio'])
  })
  it('never hides locked columns', () => {
    const cols = setVisible(resolveColumns(specs, undefined), 'name', false)
    expect(ids(cols)).toContain('name')
    expect(ids(resolveColumns(specs, { order: ['name'], visible: [] }))).toContain('name')
  })
  it('drops stale ids and appends columns added later with their default', () => {
    const r = resolveColumns(specs, { order: ['ratio', 'gone', 'name'], visible: ['name'] })
    expect(r.map((c) => c.id)).toEqual(['ratio', 'name', 'size', 'tags'])
    expect(ids(r)).toEqual(['name', 'size']) // ratio explicitly hidden; size is new → default visible; tags new → hidden
  })
  it('clamps moves', () => {
    const cols = resolveColumns(specs, undefined)
    expect(moveColumn(cols, 'name', -5).map((c) => c.id)[0]).toBe('name')
    expect(moveColumn(cols, 'tags', 9).map((c) => c.id).at(-1)).toBe('tags')
  })
})
