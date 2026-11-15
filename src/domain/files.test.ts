import { describe, expect, it } from 'vitest'
import type { TorrentFile } from '@/api/details'
import { buildFileTree, nodeProgress, visibleNodes } from './files'

const f = (index: number, name: string, size: number, progress: number, priority = 1): TorrentFile => ({ index, name, size, progress, priority })

describe('buildFileTree', () => {
  const files = [f(0, 'Show/S01/b.mkv', 300, 1), f(1, 'Show/S01/a.mkv', 100, 0.5), f(2, 'Show/readme.txt', 10, 1, 0)]
  it('groups into folders and aggregates', () => {
    const [show] = buildFileTree(files)
    expect(show?.name).toBe('Show')
    expect(show?.size).toBe(410)
    expect(show?.indices.sort()).toEqual([0, 1, 2])
    expect(nodeProgress(show!)).toBeCloseTo((300 + 50 + 10) / 410)
  })
  it('lists folders before files and sorts naturally', () => {
    const [show] = buildFileTree(files)
    expect(show?.children.map((c) => c.name)).toEqual(['S01', 'readme.txt'])
    expect(show?.children[0]?.children.map((c) => c.name)).toEqual(['a.mkv', 'b.mkv'])
  })
  it('reports mixed priority as null and shared priority otherwise', () => {
    const [show] = buildFileTree(files)
    expect(show?.priority).toBeNull()
    expect(show?.children[0]?.priority).toBe(1)
  })
  it('handles single-file torrents', () => {
    const [only] = buildFileTree([f(0, 'x.iso', 5, 0)])
    expect(only?.kind).toBe('file')
    expect(only?.depth).toBe(0)
  })
  it('hides children of collapsed folders', () => {
    const tree = buildFileTree(files)
    expect(visibleNodes(tree, new Set()).length).toBe(5)
    expect(visibleNodes(tree, new Set(['Show/S01'])).map((n) => n.name)).toEqual(['Show', 'S01', 'readme.txt'])
  })
})
