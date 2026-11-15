import { useEffect, useState, useSyncExternalStore } from 'react'
import { getText } from '@/api/transport'
import { getAppearance, subscribeAppearance, type Appearance } from '@/ui/theme'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const m = matchMedia(query)
    const on = () => setMatches(m.matches)
    m.addEventListener('change', on)
    on()
    return () => m.removeEventListener('change', on)
  }, [query])
  return matches
}

export function useAppearance(): Appearance {
  return useSyncExternalStore(subscribeAppearance, getAppearance)
}

/** qBittorrent version for display; null until known (never blocks rendering). */
export function useServerVersion(): string | null {
  const [v, setV] = useState<string | null>(null)
  useEffect(() => {
    getText('app/version').then((s) => setV(s.trim().replace(/^v/, '')), () => setV(null))
  }, [])
  return v
}
