import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { countByStatus, matchesStatus, splitTags } from './filters'
import { extensionOf, fileKind } from './fileKind'
import { compileQuery, parseClause, parseQuery, tokenize } from './query'
import { sortTorrents } from './sort'

const T = (o: Partial<Torrent>): Torrent =>
  ({ name: 'x', state: 'downloading', progress: 0, size: 0, dlspeed: 0, upspeed: 0, eta: 0, ratio: 0, category: '', tags: '', added_on: 0, ...o }) as Torrent

describe('filters', () => {
  it('maps states to views, including 4.x paused* names', () => {
    expect(matchesStatus('stopped', T({ state: 'pausedDL' }))).toBe(true)
    expect(matchesStatus('stopped', T({ state: 'stoppedUP' }))).toBe(true)
    expect(matchesStatus('running', T({ state: 'stoppedUP' }))).toBe(false)
    expect(matchesStatus('seeding', T({ state: 'stalledUP' }))).toBe(true)
    expect(matchesStatus('active', T({ upspeed: 1 }))).toBe(true)
    expect(matchesStatus('completed', T({ progress: 1, state: 'stoppedUP' }))).toBe(true)
  })
  it('counts each view', () => {
    const c = countByStatus([T({ state: 'error' }), T({ state: 'uploading', progress: 1, upspeed: 5 })])
    expect(c).toMatchObject({ all: 2, errored: 1, seeding: 1, completed: 1, active: 1 })
  })
  it('splits tags', () => expect(splitTags('4k, archive,')).toEqual(['4k', 'archive']))
})

describe('query', () => {
  it('tokenizes quotes', () => expect(tokenize('cat:"tv shows" ubuntu -tag:x')).toEqual(['cat:tv shows', 'ubuntu', '-tag:x']))
  it('parses numeric clauses with units', () => {
    expect(parseClause('size:>1GiB')).toMatchObject({ kind: 'size', op: '>', value: 1024 ** 3 })
    expect(parseClause('progress:>=50')).toMatchObject({ kind: 'progress', op: '>=', value: 0.5 })
    expect(parseClause('ratio:<1')).toMatchObject({ kind: 'ratio', op: '<', value: 1 })
    expect(parseClause('size:>1XB').kind).toBe('invalid')
    expect(parseClause('state:nope').kind).toBe('invalid')
  })
  it('filters with AND and negation', () => {
    const pred = compileQuery(parseQuery('ubuntu cat:linux -tag:old size:>1GB'))
    expect(pred(T({ name: 'Ubuntu 24.04', category: 'Linux', size: 6e9 }))).toBe(true)
    expect(pred(T({ name: 'Ubuntu 24.04', category: 'Linux', size: 6e9, tags: 'old' }))).toBe(false)
    expect(pred(T({ name: 'Debian', category: 'linux', size: 6e9 }))).toBe(false)
  })
  it('ignores invalid clauses rather than hiding everything', () => {
    expect(compileQuery(parseQuery('state:nope'))(T({}))).toBe(true)
  })
})

describe('sort', () => {
  it('sorts with infinite ETA last ascending and stable tie-break', () => {
    const out = sortTorrents(
      [['b', T({ name: 'b', eta: 8_640_000 })], ['a', T({ name: 'a', eta: 10 })], ['c', T({ name: 'c', eta: 10 })]],
      { key: 'eta', dir: 'asc' },
    ).map(([h]) => h)
    expect(out).toEqual(['a', 'c', 'b'])
  })
  it('natural name order', () => {
    const out = sortTorrents([['1', T({ name: 'file10' })], ['2', T({ name: 'file2' })]], { key: 'name', dir: 'asc' })
    expect(out.map(([h]) => h)).toEqual(['2', '1'])
  })
})

describe('fileKind', () => {
  it('reads extensions', () => {
    expect(extensionOf('a/b/Movie.MKV')).toBe('mkv')
    expect(extensionOf('.hidden')).toBe('')
    expect(extensionOf('Show.S01.1080p')).toBe('1080p')
  })
  it('classifies torrent names', () => {
    expect(fileKind('ubuntu-24.04.3-desktop-amd64.iso')).toBe('disc')
    expect(fileKind('Sintel.2010.4K.mkv')).toBe('video')
    expect(fileKind('Some.Show.S01.1080p.WEB')).toBe('folder')
    expect(fileKind('wikipedia_en_all_maxi_2026-10.zim', { isDirectory: false })).toBe('file')
    expect(fileKind('notes', { isDirectory: true })).toBe('folder')
  })
})
