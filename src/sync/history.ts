import type { Torrent } from '@/api/types'

/** Rolling transfer-speed samples, recorded client-side while the UI is open. Pure; capped. */
export interface Sample {
  /** Unix seconds. */
  readonly t: number
  readonly dl: number
  readonly up: number
}

/** Global: 5 minutes at the 2 s poll interval. */
export const HISTORY_LENGTH = 150
/** Per torrent: 3 minutes. */
export const TORRENT_HISTORY_LENGTH = 90
/** Bound on how many torrents keep a history (memory stays flat for huge libraries). */
export const MAX_TRACKED_TORRENTS = 300

export function pushSample(h: readonly Sample[], s: Sample, max = HISTORY_LENGTH): readonly Sample[] {
  return h.length >= max ? [...h.slice(h.length - max + 1), s] : [...h, s]
}

/**
 * Appends one sample per *active* torrent. A torrent starts being tracked when it transfers, and is
 * dropped once its whole window is idle or it no longer exists. Untouched maps are returned as-is.
 */
export function pushTorrentSamples(
  prev: ReadonlyMap<string, readonly Sample[]>,
  torrents: ReadonlyMap<string, Torrent>,
  t: number,
  opts: { length?: number; maxTracked?: number } = {},
): ReadonlyMap<string, readonly Sample[]> {
  const length = opts.length ?? TORRENT_HISTORY_LENGTH
  const maxTracked = opts.maxTracked ?? MAX_TRACKED_TORRENTS
  const next = new Map<string, readonly Sample[]>()
  for (const [hash, h] of prev) {
    const tor = torrents.get(hash)
    if (!tor) continue
    const s = { t, dl: tor.dlspeed ?? 0, up: tor.upspeed ?? 0 }
    const pushed = pushSample(h, s, length)
    if (pushed.some((x) => x.dl > 0 || x.up > 0)) next.set(hash, pushed)
  }
  for (const [hash, tor] of torrents) {
    if (next.size >= maxTracked) break
    if (next.has(hash) || prev.has(hash)) continue
    if ((tor.dlspeed ?? 0) > 0 || (tor.upspeed ?? 0) > 0) next.set(hash, [{ t, dl: tor.dlspeed, up: tor.upspeed }])
  }
  return next.size === 0 && prev.size === 0 ? prev : next
}
