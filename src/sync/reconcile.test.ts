import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { emptySyncState, reconcile } from './reconcile'

const t = (name: string, extra: Partial<Torrent> = {}): Partial<Torrent> => ({ name, progress: 0, added_on: 1, ...extra })

describe('reconcile', () => {
  it('full update replaces all state', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, torrents: { a: t('A') } })
    const b = reconcile(a, { rid: 2, full_update: true, torrents: { b: t('B') } })
    expect([...b.torrents.keys()]).toEqual(['b'])
    expect(b.rid).toBe(2)
  })

  it('partial update merges fields and keeps unknown ones', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, torrents: { a: t('A', { future_field: 42 }) } })
    const b = reconcile(a, { rid: 2, torrents: { a: { progress: 0.5 } } })
    expect(b.torrents.get('a')).toMatchObject({ name: 'A', progress: 0.5, future_field: 42 })
  })

  it('preserves identity of untouched torrents', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, torrents: { a: t('A'), b: t('B') } })
    const b = reconcile(a, { rid: 2, torrents: { a: { progress: 1 } } })
    expect(b.torrents.get('b')).toBe(a.torrents.get('b'))
    expect(b.torrents.get('a')).not.toBe(a.torrents.get('a'))
  })

  it('removes torrents', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, torrents: { a: t('A'), b: t('B') } })
    const b = reconcile(a, { rid: 2, torrents_removed: ['a'] })
    expect([...b.torrents.keys()]).toEqual(['b'])
  })

  it('empty delta only advances rid and keeps torrent map identity', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, torrents: { a: t('A') } })
    const b = reconcile(a, { rid: 2 })
    expect(b.rid).toBe(2)
    expect(b.torrents).toBe(a.torrents)
  })

  it('returns same state when nothing changed at all', () => {
    const a = reconcile(emptySyncState, { rid: 3, full_update: true })
    expect(reconcile(a, { rid: 3 })).toBe(a)
  })

  it('merges server_state and replaces it on full update', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, server_state: { dl_info_speed: 1, up_info_speed: 2 } })
    const b = reconcile(a, { rid: 2, server_state: { dl_info_speed: 9 } })
    expect(b.serverState).toMatchObject({ dl_info_speed: 9, up_info_speed: 2 })
    const c = reconcile(b, { rid: 1, full_update: true, server_state: { dl_info_speed: 5 } })
    expect(c.serverState).toEqual({ dl_info_speed: 5 })
    expect(c.rid).toBe(1) // rid wrap-around is accepted on full update
  })
})

describe('reconcile categories and tags', () => {
  it('merges and removes categories, keeping identity of untouched ones', () => {
    const a = reconcile(emptySyncState, {
      rid: 1,
      full_update: true,
      categories: { linux: { name: 'linux', savePath: '/d/linux' }, films: { name: 'films', savePath: '' } },
    })
    const b = reconcile(a, { rid: 2, categories: { linux: { savePath: '/x' } }, categories_removed: [] })
    expect(b.categories.get('linux')).toEqual({ name: 'linux', savePath: '/x' })
    expect(b.categories.get('films')).toBe(a.categories.get('films'))
    const c = reconcile(b, { rid: 3, categories_removed: ['films'] })
    expect([...c.categories.keys()]).toEqual(['linux'])
  })

  it('adds and removes tags without duplicates', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, tags: ['4k', 'archive'] })
    const b = reconcile(a, { rid: 2, tags: ['4k', 'lts'], tags_removed: ['archive'] })
    expect(b.tags).toEqual(['4k', 'lts'])
  })

  it('keeps tag array identity when no tag change', () => {
    const a = reconcile(emptySyncState, { rid: 1, full_update: true, tags: ['x'] })
    const b = reconcile(a, { rid: 2, torrents: { h: { name: 'n' } } })
    expect(b.tags).toBe(a.tags)
  })
})
