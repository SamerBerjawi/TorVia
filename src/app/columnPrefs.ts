import { useSyncExternalStore } from 'react'
import type { ColumnPrefs } from '@/domain/columns'
import type { Skin } from '@/ui/theme'

const KEY = 'torvia.columns'
type All = Partial<Record<Skin, ColumnPrefs>>

function read(): All {
  try {
    const raw = localStorage.getItem(KEY)
    const v: unknown = raw ? JSON.parse(raw) : {}
    return typeof v === 'object' && v !== null ? (v as All) : {}
  } catch {
    return {}
  }
}

let state: All = read()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Column layout is remembered per skin in this browser (each skin has its own column set). */
export function setColumnPrefs(skin: Skin, prefs: ColumnPrefs | undefined): void {
  const next = { ...state }
  if (prefs) next[skin] = prefs
  else delete next[skin]
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota: keep the in-memory choice for this session */
  }
  emit()
}

export const useColumnPrefs = (skin: Skin): ColumnPrefs | undefined =>
  useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state[skin])
