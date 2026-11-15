import { create } from 'zustand'
import type { StatusFilter } from '@/domain/filters'
import type { Sort, SortKey } from '@/domain/sort'

/** View state shared by every skin. Device-local and ephemeral (not persisted yet). */
interface UiState {
  status: StatusFilter
  category: string | null // null = all, '' = uncategorised
  tag: string | null
  query: string
  sort: Sort
  groupByCategory: boolean
  selected: ReadonlySet<string>
  anchor: string | null
  focused: string | null
  detailsOpen: boolean

  setStatus(s: StatusFilter): void
  setCategory(c: string | null): void
  setTag(t: string | null): void
  setQuery(q: string): void
  sortBy(key: SortKey): void
  setSort(sort: Sort): void
  setGroupByCategory(on: boolean): void
  select(hash: string, mode: 'single' | 'toggle' | 'range', order: readonly string[]): void
  selectAll(order: readonly string[]): void
  clearSelection(): void
  focus(hash: string | null): void
  openDetails(hash: string): void
  closeDetails(): void
  /** Drop selection/focus for torrents that no longer exist. */
  prune(exists: (hash: string) => boolean): void
}

const NUMERIC_DEFAULT_DESC = new Set<SortKey>(['progress', 'size', 'dlspeed', 'upspeed', 'ratio', 'added_on', 'num_seeds', 'num_leechs', 'downloaded', 'uploaded', 'last_activity'])

export const useUi = create<UiState>()((set, get) => ({
  status: 'all',
  category: null,
  tag: null,
  query: '',
  sort: { key: 'added_on', dir: 'desc' },
  groupByCategory: true,
  selected: new Set(),
  anchor: null,
  focused: null,
  detailsOpen: false,

  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  setTag: (tag) => set({ tag }),
  setQuery: (query) => set({ query }),
  setSort: (sort) => set({ sort }),
  sortBy: (key) => {
    const { sort } = get()
    set({ sort: sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: NUMERIC_DEFAULT_DESC.has(key) ? 'desc' : 'asc' } })
  },
  setGroupByCategory: (groupByCategory) => set({ groupByCategory }),
  select: (hash, mode, order) => {
    const { selected, anchor } = get()
    if (mode === 'toggle') {
      const next = new Set(selected)
      if (next.has(hash)) next.delete(hash)
      else next.add(hash)
      set({ selected: next, anchor: hash, focused: hash })
    } else if (mode === 'range' && anchor) {
      const a = order.indexOf(anchor)
      const b = order.indexOf(hash)
      if (a < 0 || b < 0) return set({ selected: new Set([hash]), anchor: hash, focused: hash })
      const [lo, hi] = a < b ? [a, b] : [b, a]
      set({ selected: new Set(order.slice(lo, hi + 1)), focused: hash })
    } else {
      set({ selected: new Set([hash]), anchor: hash, focused: hash })
    }
  },
  selectAll: (order) => set({ selected: new Set(order) }),
  clearSelection: () => set({ selected: new Set(), anchor: null }),
  focus: (focused) => set({ focused }),
  openDetails: (hash) => set({ focused: hash, detailsOpen: true, selected: get().selected.has(hash) ? get().selected : new Set([hash]), anchor: hash }),
  closeDetails: () => set({ detailsOpen: false }),
  prune: (exists) => {
    const { selected, focused } = get()
    const kept = [...selected].filter(exists)
    if (kept.length !== selected.size || (focused && !exists(focused))) {
      set({ selected: new Set(kept), focused: focused && exists(focused) ? focused : null, detailsOpen: focused && exists(focused) ? get().detailsOpen : false })
    }
  },
}))
