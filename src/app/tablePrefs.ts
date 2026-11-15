import { useSyncExternalStore } from 'react'
import { DENSITIES, parseLayouts, removeLayout, upsertLayout, type Density, type Layout } from '@/domain/layouts'

/** Row density and saved table layouts: device-local, kept in localStorage (failures keep the session value). */
const DENSITY_KEY = 'torvia.density'
const LAYOUTS_KEY = 'torvia.layouts'

function load<T>(key: string, fallback: T, parse: (v: unknown) => T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : parse(JSON.parse(raw))
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

function makeStore<T>(key: string, initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) { value = next; save(key, next); listeners.forEach((l) => l()) },
    subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l) },
  }
}

const density = makeStore<Density>(DENSITY_KEY, load<Density>(DENSITY_KEY, 'comfortable', (v) => ((DENSITIES as readonly unknown[]).includes(v) ? (v as Density) : 'comfortable')))
const layouts = makeStore<Layout[]>(LAYOUTS_KEY, load(LAYOUTS_KEY, [], parseLayouts))

export const useDensity = () => useSyncExternalStore(density.subscribe, density.get)
export const setDensity = (d: Density) => density.set(d)

export const useLayouts = () => useSyncExternalStore(layouts.subscribe, layouts.get)
export const saveLayout = (l: Layout) => layouts.set(upsertLayout(layouts.get(), l))
export const deleteLayout = (skin: string, name: string) => layouts.set(removeLayout(layouts.get(), skin, name))
