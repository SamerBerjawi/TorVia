import { useSyncExternalStore } from 'react'

/** Saved queries, per device. Will move to qBittorrent's `clientdata` store when available. */
const KEY = 'torvia.savedViews'
const listeners = new Set<() => void>()

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

let current = read()

function write(next: string[]) {
  current = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable: kept for this session only
  }
  listeners.forEach((l) => l())
}

export const saveView = (q: string) => q.trim() && !current.includes(q.trim()) && write([...current, q.trim()])
export const removeView = (q: string) => write(current.filter((x) => x !== q))
export const useSavedViews = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => current)
