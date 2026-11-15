import type { Torrent } from '@/api/types'

/**
 * Names of torrents that finished downloading between two syncs. Pure.
 * Only torrents present in `prev` can "complete": a torrent first seen already at 100% (page load,
 * or newly added and already complete) is not news.
 */
export function findCompleted(prev: ReadonlyMap<string, Torrent>, next: ReadonlyMap<string, Torrent>): string[] {
  const done: string[] = []
  for (const [hash, t] of next) {
    const before = prev.get(hash)
    if (before && before.progress < 1 && t.progress >= 1) done.push(t.name)
  }
  return done
}
