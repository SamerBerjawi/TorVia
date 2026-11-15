import { describe, expect, it } from 'vitest'
import { articlesOf, downloadLink, flattenFeeds, parseRssTree, ruleDefinition } from './rss'

const art = (id: string, date: string, isRead = false) => ({ id, title: `t${id}`, date, isRead, torrentURL: `https://x/${id}.torrent` })
const raw = {
  Linux: { url: 'https://a/feed', uid: '1', articles: [art('1', 'Mon, 01 Jan 2024 10:00:00 GMT'), art('2', 'Tue, 02 Jan 2024 10:00:00 GMT', true)] },
  Shows: { HD: { url: 'https://b/feed', uid: '2', articles: [art('3', 'Wed, 03 Jan 2024 10:00:00 GMT')] } },
  Broken: 'nope',
}

describe('rss tree', () => {
  const tree = parseRssTree(raw)
  it('puts folders first, nests feeds, and skips junk', () => {
    expect(tree.map((n) => [n.kind, n.name])).toEqual([['folder', 'Shows'], ['feed', 'Linux']])
    expect(tree[0]?.children[0]?.path).toBe('Shows\\HD')
  })
  it('counts unread, rolling folders up', () => {
    expect(tree[1]?.unread).toBe(1)
    expect(tree[0]?.unread).toBe(1)
  })
  it('lists articles newest first, for a folder or everything', () => {
    expect(articlesOf(tree[1], tree).map((a) => a.id)).toEqual(['2', '1'])
    expect(articlesOf(undefined, tree).map((a) => a.id)).toEqual(['3', '2', '1'])
    expect(flattenFeeds(tree).map((f) => f.name)).toEqual(['HD', 'Linux'])
  })
  it('tolerates malformed articles', () => {
    const t = parseRssTree({ F: { url: 'u', articles: [{ id: 1 }, null, { id: 'a', title: 'ok' }] } })
    expect(t[0]?.articles.map((a) => a.id)).toEqual(['a'])
  })
})

describe('rss helpers', () => {
  it('chooses a download link', () => {
    expect(downloadLink({ torrentURL: 'https://t/x.torrent', link: 'https://page' })).toBe('https://t/x.torrent')
    expect(downloadLink({ link: 'magnet:?xt=urn:btih:abc' })).toBe('magnet:?xt=urn:btih:abc')
    expect(downloadLink({ link: 'javascript:alert(1)' })).toBeNull()
    expect(downloadLink({})).toBeNull()
  })
  it('keeps unknown rule keys and trims text', () => {
    expect(ruleDefinition({ enabled: true, smartFilter: false }, { mustContain: '  1080p ' })).toEqual({ enabled: true, smartFilter: false, mustContain: '1080p' })
  })
})
