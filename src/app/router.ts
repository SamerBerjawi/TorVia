import { useSyncExternalStore } from 'react'

/**
 * Hash routing (qBittorrent has no SPA fallback, so deep links must live in the hash).
 * Routes: '#/' torrents, then '#/search', '#/rss', '#/create', '#/logs', '#/statistics', '#/settings'.
 */
export const ROUTES = ['torrents', 'search', 'rss', 'create', 'logs', 'statistics', 'settings'] as const
export type Route = (typeof ROUTES)[number]

function parse(): Route {
  const first = location.hash.replace(/^#\/?/, '').split(/[?/]/)[0]
  return (ROUTES as readonly string[]).includes(first ?? '') ? (first as Route) : 'torrents'
}

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

export const useRoute = (): Route => useSyncExternalStore(subscribe, parse)
export const hrefFor = (r: Route): string => (r === 'torrents' ? '#/' : `#/${r}`)

/** The raw location hash, reactive (used by pages that read parameters from it, e.g. `#/search?q=…`). */
export const useHash = (): string => useSyncExternalStore(subscribe, () => location.hash)
