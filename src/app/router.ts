import { useSyncExternalStore } from 'react'

/**
 * Hash routing (qBittorrent has no SPA fallback, so deep links must live in the hash).
 * Routes: '#/' torrents, '#/statistics'.
 */
export type Route = 'torrents' | 'statistics'

function parse(): Route {
  return location.hash.replace(/^#\/?/, '').split(/[?/]/)[0] === 'statistics' ? 'statistics' : 'torrents'
}

const subscribe = (l: () => void) => {
  window.addEventListener('hashchange', l)
  return () => window.removeEventListener('hashchange', l)
}

export const useRoute = (): Route => useSyncExternalStore(subscribe, parse)
export const hrefFor = (r: Route): string => (r === 'torrents' ? '#/' : `#/${r}`)
