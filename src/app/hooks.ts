import { useEffect, useState, useSyncExternalStore } from 'react'
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
