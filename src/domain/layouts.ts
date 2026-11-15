import type { ColumnPrefs } from './columns'
import { SORT_KEYS, type Sort } from './sort'

/** A named snapshot of how the table looks. Columns are per skin, so a layout belongs to one skin. */
export const DENSITIES = ['compact', 'comfortable', 'spacious'] as const
export type Density = (typeof DENSITIES)[number]
export const DENSITY_LABEL: Record<Density, string> = { compact: 'Compact', comfortable: 'Comfortable', spacious: 'Spacious' }
/** Pixels added to a skin's base row height. */
export const DENSITY_DELTA: Record<Density, number> = { compact: -8, comfortable: 0, spacious: 8 }

export interface Layout {
  name: string
  skin: string
  /** undefined = the skin's default columns. */
  columns: ColumnPrefs | undefined
  sort: Sort
  density: Density
}

const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Validates stored JSON; anything malformed is dropped rather than trusted. */
export function parseLayouts(raw: unknown): Layout[] {
  if (!Array.isArray(raw)) return []
  const out: Layout[] = []
  for (const r of raw) {
    if (typeof r !== 'object' || r === null) continue
    const o = r as Record<string, unknown>
    const s = o['sort'] as Record<string, unknown> | undefined
    const c = o['columns'] as Record<string, unknown> | undefined
    if (typeof o['name'] !== 'string' || o['name'].trim() === '' || typeof o['skin'] !== 'string') continue
    if (!s || !(SORT_KEYS as readonly unknown[]).includes(s['key']) || (s['dir'] !== 'asc' && s['dir'] !== 'desc')) continue
    if (!(DENSITIES as readonly unknown[]).includes(o['density'])) continue
    if (c !== undefined && !(isStrings(c['order']) && isStrings(c['visible']))) continue
    out.push({
      name: o['name'].trim(), skin: o['skin'], density: o['density'] as Density,
      sort: { key: s['key'] as Sort['key'], dir: s['dir'] },
      columns: c === undefined ? undefined : { order: c['order'] as string[], visible: c['visible'] as string[] },
    })
  }
  return out
}

/** Adds a layout; saving under an existing name (same skin, case-insensitive) replaces it. */
export function upsertLayout(list: readonly Layout[], layout: Layout): Layout[] {
  const same = (l: Layout) => l.skin === layout.skin && l.name.toLowerCase() === layout.name.toLowerCase()
  return list.some(same) ? list.map((l) => (same(l) ? layout : l)) : [...list, layout]
}

export const removeLayout = (list: readonly Layout[], skin: string, name: string): Layout[] =>
  list.filter((l) => !(l.skin === skin && l.name === name))

export const layoutsFor = (list: readonly Layout[], skin: string): Layout[] =>
  list.filter((l) => l.skin === skin).sort((a, b) => a.name.localeCompare(b.name))
