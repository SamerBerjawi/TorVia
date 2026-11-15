import type { SearchPlugin, SearchResult } from '@/api/search'

export type SearchSort = 'seeders' | 'size' | 'name' | 'leechers'
export interface ResultSort { key: SearchSort; dir: 'asc' | 'desc' }

/** qBittorrent reports -1 when a plugin doesn't know seeders/leechers/size; those sort last either way. */
const known = (n: number) => (n >= 0 ? n : Number.NEGATIVE_INFINITY)

export function sortResults(list: readonly SearchResult[], sort: ResultSort): SearchResult[] {
  const sign = sort.dir === 'asc' ? 1 : -1
  const val = (r: SearchResult): number | string => sort.key === 'seeders' ? known(r.nbSeeders) : sort.key === 'leechers' ? known(r.nbLeechers) : sort.key === 'size' ? known(r.fileSize) : r.fileName.toLowerCase()
  return [...list].sort((a, b) => {
    const x = val(a), y = val(b)
    const c = typeof x === 'string' || typeof y === 'string' ? String(x).localeCompare(String(y), undefined, { numeric: true }) : x === y ? 0 : x < y ? -1 : 1
    return c * sign
  })
}

/** Narrows results client-side (the server already matched the pattern). */
export function filterResults(list: readonly SearchResult[], text: string, minSeeders: number): SearchResult[] {
  const t = text.trim().toLowerCase()
  return list.filter((r) => (t === '' || r.fileName.toLowerCase().includes(t)) && (minSeeders <= 0 || r.nbSeeders >= minSeeders))
}

/** Categories offered when searching: those every chosen plugin supports, 'all' always first. */
export function commonCategories(plugins: readonly SearchPlugin[]): { id: string; name: string }[] {
  if (plugins.length === 0) return [{ id: 'all', name: 'All categories' }]
  const sets = plugins.map((p) => new Map(p.supportedCategories.map((c) => [c.id, c.name])))
  const first = sets[0]!
  const out = [...first].filter(([id]) => sets.every((s) => s.has(id)) && id !== 'all').map(([id, name]) => ({ id, name }))
  return [{ id: 'all', name: 'All categories' }, ...out.sort((a, b) => a.name.localeCompare(b.name))]
}

export const displaySize = (n: number, fmt: (b: number) => string) => (n >= 0 ? fmt(n) : '—')
export const displayCount = (n: number) => (n >= 0 ? String(n) : '—')
