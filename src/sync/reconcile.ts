import type { MainDataResponse, ServerState, Torrent } from '@/api/types'

export interface SyncState {
  rid: number
  torrents: ReadonlyMap<string, Torrent>
  serverState: Partial<ServerState>
}

export const emptySyncState: SyncState = { rid: 0, torrents: new Map(), serverState: {} }

/**
 * Pure reducer for `sync/maindata`. Contract:
 *  - `full_update` replaces everything (also covers rid wrap-around / server-side resets).
 *  - otherwise per-field merge; untouched torrents keep their object identity
 *    (so memoised rows don't re-render), removed hashes are dropped.
 *  - unknown fields are preserved for forward compatibility.
 * Returns the same `state` reference when the delta changes nothing except `rid`.
 */
export function reconcile(state: SyncState, delta: MainDataResponse): SyncState {
  const full = delta.full_update === true
  const torrents = new Map(full ? [] : state.torrents)
  let changed = full

  for (const [hash, patch] of Object.entries(delta.torrents ?? {})) {
    const prev = torrents.get(hash)
    torrents.set(hash, prev ? { ...prev, ...patch } : (patch as Torrent))
    changed = true
  }
  for (const hash of delta.torrents_removed ?? []) {
    if (torrents.delete(hash)) changed = true
  }

  let serverState = full ? (delta.server_state ?? {}) : state.serverState
  if (!full && delta.server_state && Object.keys(delta.server_state).length > 0) {
    serverState = { ...state.serverState, ...delta.server_state }
    changed = true
  }

  if (!changed) return state.rid === delta.rid ? state : { ...state, rid: delta.rid }
  return { rid: delta.rid, torrents, serverState }
}
