import type { Category, MainDataResponse, ServerState, Torrent } from '@/api/types'

export interface SyncState {
  rid: number
  torrents: ReadonlyMap<string, Torrent>
  categories: ReadonlyMap<string, Category>
  tags: readonly string[]
  serverState: Partial<ServerState>
}

export const emptySyncState: SyncState = {
  rid: 0,
  torrents: new Map(),
  categories: new Map(),
  tags: [],
  serverState: {},
}

/** Merges `patches` into `prev` (or replaces when `full`); untouched entries keep identity. */
function mergeMap<T>(
  prev: ReadonlyMap<string, T>,
  full: boolean,
  patches: Record<string, Partial<T>> | undefined,
  removed: readonly string[] | undefined,
): ReadonlyMap<string, T> {
  if (!full && !patches && !removed?.length) return prev
  const next = new Map(full ? [] : prev)
  let changed = full
  for (const [key, patch] of Object.entries(patches ?? {})) {
    const old = next.get(key)
    next.set(key, old ? { ...old, ...patch } : (patch as T))
    changed = true
  }
  for (const key of removed ?? []) if (next.delete(key)) changed = true
  return changed ? next : prev
}

function mergeTags(prev: readonly string[], full: boolean, added?: string[], removed?: string[]): readonly string[] {
  if (full) return [...new Set(added ?? [])]
  if (!added?.length && !removed?.length) return prev
  const set = new Set(prev)
  for (const t of added ?? []) set.add(t)
  for (const t of removed ?? []) set.delete(t)
  return [...set]
}

/**
 * Pure reducer for `sync/maindata`. Contract:
 *  - `full_update` replaces everything (also covers rid wrap-around / server-side resets).
 *  - otherwise per-field merge; untouched torrents/categories keep object identity
 *    (memoised rows skip re-render), removed keys are dropped.
 *  - unknown fields are preserved for forward compatibility.
 * Returns the same `state` reference when the delta changes nothing except `rid`.
 */
export function reconcile(state: SyncState, delta: MainDataResponse): SyncState {
  const full = delta.full_update === true
  const torrents = mergeMap(state.torrents, full, delta.torrents, delta.torrents_removed)
  const categories = mergeMap(state.categories, full, delta.categories, delta.categories_removed)
  const tags = mergeTags(state.tags, full, delta.tags, delta.tags_removed)

  let serverState = full ? (delta.server_state ?? {}) : state.serverState
  if (!full && delta.server_state && Object.keys(delta.server_state).length > 0) {
    serverState = { ...state.serverState, ...delta.server_state }
  }

  const changed =
    full ||
    torrents !== state.torrents ||
    categories !== state.categories ||
    tags !== state.tags ||
    serverState !== state.serverState
  if (!changed) return state.rid === delta.rid ? state : { ...state, rid: delta.rid }
  return { rid: delta.rid, torrents, categories, tags, serverState }
}
