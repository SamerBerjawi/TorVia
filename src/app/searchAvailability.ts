import { useSyncExternalStore } from 'react'
import { searchApi } from '@/api/search'

/**
 * Whether qBittorrent's search can work at all (Python installed and at least one enabled plugin). Loaded once after
 * sign-in so "Search for similar" buttons only appear when they lead somewhere useful.
 */
let available = false
let started = false
const listeners = new Set<() => void>()

export function loadSearchAvailability(): void {
  if (started) return
  started = true
  searchApi.plugins().then((p) => { available = p.some((x) => x.enabled) }).catch(() => { available = false }).finally(() => listeners.forEach((l) => l()))
}
export const useSearchAvailable = (): boolean => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => available)
