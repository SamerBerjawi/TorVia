import { describe, expect, it } from 'vitest'
import type { SearchPlugin, SearchResult } from '@/api/search'
import { commonCategories, displayCount, filterResults, sortResults } from './search'

const r = (fileName: string, nbSeeders: number, fileSize = 100, nbLeechers = 0): SearchResult => ({ fileName, fileUrl: `magnet:?${fileName}`, fileSize, nbSeeders, nbLeechers })
const list = [r('b', 5), r('a', -1), r('c', 50), r('d', 0)]

describe('search results', () => {
  it('sorts by seeders, unknown (-1) last in descending order', () => {
    expect(sortResults(list, { key: 'seeders', dir: 'desc' }).map((x) => x.fileName)).toEqual(['c', 'b', 'd', 'a'])
    expect(sortResults(list, { key: 'seeders', dir: 'asc' }).map((x) => x.fileName)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('sorts by name naturally and does not mutate the input', () => {
    const copy = [...list]
    expect(sortResults([r('x10', 1), r('x2', 1)], { key: 'name', dir: 'asc' }).map((x) => x.fileName)).toEqual(['x2', 'x10'])
    sortResults(list, { key: 'name', dir: 'asc' })
    expect(list).toEqual(copy)
  })
  it('filters by text and minimum seeders', () => {
    expect(filterResults(list, 'C', 0).map((x) => x.fileName)).toEqual(['c'])
    expect(filterResults(list, '', 5).map((x) => x.fileName)).toEqual(['b', 'c'])
  })
  it('shows unknown counts as a dash', () => {
    expect(displayCount(-1)).toBe('—')
    expect(displayCount(0)).toBe('0')
  })
})

describe('commonCategories', () => {
  const p = (name: string, ids: string[]): SearchPlugin => ({ name, fullName: name, enabled: true, supportedCategories: ids.map((id) => ({ id, name: id.toUpperCase() })) })
  it('keeps only categories every plugin supports, with "all" first', () => {
    expect(commonCategories([p('a', ['all', 'movies', 'tv']), p('b', ['all', 'tv'])]).map((c) => c.id)).toEqual(['all', 'tv'])
  })
  it('falls back to all when there are no plugins', () => {
    expect(commonCategories([]).map((c) => c.id)).toEqual(['all'])
  })
})
