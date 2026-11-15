import { useEffect, useMemo } from 'react'
import type { Torrent } from '@/api/types'
import { countByKey, countByStatus, matchesStatus, splitTags } from '@/domain/filters'
import { compileQuery, parseQuery } from '@/domain/query'
import { sortTorrents } from '@/domain/sort'
import { useEngine } from './store'
import { useUi } from './uiStore'

export type TableItem =
  | { type: 'row'; hash: string; torrent: Torrent }
  | { type: 'group'; key: string; label: string; count: number; size: number; dlspeed: number }

/** Everything a layout needs to render the torrent list, derived from sync data + UI state. */
export function useTorrentView() {
  const { data } = useEngine()
  const { status, category, tag, query, sort, groupByCategory, prune } = useUi()
  const all = data.torrents

  useEffect(() => prune((h) => all.has(h)), [all, prune])

  const clauses = useMemo(() => parseQuery(query), [query])
  const counts = useMemo(() => countByStatus(all.values()), [all])
  const categoryCounts = useMemo(() => countByKey(all.values(), (t) => [t.category ?? '']), [all])
  const tagCounts = useMemo(() => countByKey(all.values(), (t) => splitTags(t.tags ?? '')), [all])

  const rows = useMemo(() => {
    const pred = compileQuery(clauses)
    const out: [string, Torrent][] = []
    for (const entry of all) {
      const t = entry[1]
      if (!matchesStatus(status, t)) continue
      if (category !== null && (t.category ?? '') !== category) continue
      if (tag !== null && !splitTags(t.tags ?? '').includes(tag)) continue
      if (!pred(t)) continue
      out.push(entry)
    }
    return sortTorrents(out, sort)
  }, [all, clauses, status, category, tag, sort])

  const order = useMemo(() => rows.map(([h]) => h), [rows])

  const grouped = useMemo((): TableItem[] => {
    const groups = new Map<string, [string, Torrent][]>()
    for (const r of rows) {
      const k = r[1].category ?? ''
      let g = groups.get(k)
      if (!g) groups.set(k, (g = []))
      g.push(r)
    }
    const items: TableItem[] = []
    for (const [key, list] of [...groups].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))) {
      items.push({
        type: 'group', key, label: key || 'Uncategorised', count: list.length,
        size: list.reduce((s, [, t]) => s + t.size, 0), dlspeed: list.reduce((s, [, t]) => s + t.dlspeed, 0),
      })
      for (const [hash, torrent] of list) items.push({ type: 'row', hash, torrent })
    }
    return items
  }, [rows])

  const flat = useMemo((): TableItem[] => rows.map(([hash, torrent]) => ({ type: 'row', hash, torrent })), [rows])

  return {
    total: all.size,
    rows,
    order,
    items: groupByCategory ? grouped : flat,
    groupedItems: grouped,
    flatItems: flat,
    counts,
    categoryCounts,
    tagCounts,
    categories: [...data.categories.keys()].sort((a, b) => a.localeCompare(b)),
    tags: [...data.tags].sort((a, b) => a.localeCompare(b)),
    invalid: clauses.filter((c) => c.kind === 'invalid'),
  }
}
