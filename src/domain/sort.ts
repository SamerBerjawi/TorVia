import type { Torrent } from '@/api/types'

export const SORT_KEYS = ['name', 'state', 'progress', 'size', 'dlspeed', 'upspeed', 'eta', 'ratio', 'added_on'] as const
export type SortKey = (typeof SORT_KEYS)[number]
export interface Sort { key: SortKey; dir: 'asc' | 'desc' }

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
const INFINITE_ETA = 8_640_000

function value(t: Torrent, key: SortKey): number | string {
  if (key === 'eta') return t.eta >= INFINITE_ETA || t.eta < 0 ? Number.POSITIVE_INFINITY : t.eta
  return t[key]
}

/** Stable sort of [hash, torrent] entries; ties fall back to name then hash so order never flickers. */
export function sortTorrents(entries: [string, Torrent][], sort: Sort): [string, Torrent][] {
  const sign = sort.dir === 'asc' ? 1 : -1
  return entries.sort((a, b) => {
    const va = value(a[1], sort.key)
    const vb = value(b[1], sort.key)
    let c = typeof va === 'string' || typeof vb === 'string' ? collator.compare(String(va), String(vb)) : va === vb ? 0 : va < vb ? -1 : 1
    if (c === 0) c = collator.compare(a[1].name, b[1].name) || (a[0] < b[0] ? -1 : 1)
    return c * sign
  })
}
