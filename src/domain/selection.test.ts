import { describe, expect, it } from 'vitest'
import type { Torrent } from '@/api/types'
import { looksLikeTorrentLink, parseLinks, selectionFacts } from './selection'

const T = (o: Partial<Torrent>) => ({ state: 'downloading', progress: 0, tags: '', category: '', save_path: '/d', ...o }) as Torrent

describe('selectionFacts', () => {
  it('summarises run state and toggles', () => {
    const f = selectionFacts([T({ state: 'stoppedDL', seq_dl: true }), T({ state: 'uploading', progress: 1, seq_dl: true })])
    expect(f).toMatchObject({ count: 2, anyRunning: true, anyStopped: true, allComplete: false, allSequential: true })
  })
  it('finds common category and save path, null when mixed', () => {
    expect(selectionFacts([T({ category: 'a' }), T({ category: 'a' })]).commonCategory).toBe('a')
    expect(selectionFacts([T({ category: 'a' }), T({ category: 'b' })]).commonCategory).toBeNull()
    expect(selectionFacts([T({ save_path: '/x' }), T({ save_path: '/y' })]).commonSavePath).toBeNull()
  })
  it('counts tags across the selection', () => {
    const f = selectionFacts([T({ tags: '4k, lts' }), T({ tags: '4k' })])
    expect([...f.tagCounts]).toEqual([['4k', 2], ['lts', 1]])
  })
  it('is empty-safe', () => expect(selectionFacts([])).toMatchObject({ count: 0, allComplete: false, commonCategory: null }))
})

describe('parseLinks', () => {
  it('accepts magnets, http(s) and bare info-hashes; dedupes', () => {
    const text = 'magnet:?xt=urn:btih:abc\n\nhttps://example.org/a.torrent, magnet:?xt=urn:btih:abc\n' + 'a'.repeat(40) + '\nnot a link'
    expect(parseLinks(text)).toEqual(['magnet:?xt=urn:btih:abc', 'https://example.org/a.torrent', 'a'.repeat(40)])
  })
  it('detects pasted links', () => {
    expect(looksLikeTorrentLink('hello')).toBe(false)
    expect(looksLikeTorrentLink(' magnet:?xt=urn:btih:x ')).toBe(true)
  })
})
