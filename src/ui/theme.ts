/**
 * Appearance preferences (per device). Applies `data-skin` and `data-mode` on <html>;
 * tokens.css resolves every colour/typeface from those two attributes.
 * No React here so the sign-in page can use it too.
 */
export const SKINS = ['graphite', 'paper', 'signal'] as const
export type Skin = (typeof SKINS)[number]
export const MODES = ['system', 'light', 'dark'] as const
export type Mode = (typeof MODES)[number]

export const SKIN_LABEL: Record<Skin, string> = { graphite: 'Graphite', paper: 'Paper', signal: 'Signal' }
export const MODE_LABEL: Record<Mode, string> = { system: 'System', light: 'Light', dark: 'Dark' }

export interface Appearance { skin: Skin; mode: Mode }

const KEY = 'torvia.appearance'
const DEFAULT: Appearance = { skin: 'graphite', mode: 'system' }

function read(): Appearance {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Appearance> | null
    return {
      skin: SKINS.includes(raw?.skin as Skin) ? (raw!.skin as Skin) : DEFAULT.skin,
      mode: MODES.includes(raw?.mode as Mode) ? (raw!.mode as Mode) : DEFAULT.mode,
    }
  } catch {
    return DEFAULT // storage blocked (private mode, site data disabled)
  }
}

let current = read()
const listeners = new Set<() => void>()
const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

export function resolvedMode(a: Appearance = current): 'light' | 'dark' {
  if (a.mode !== 'system') return a.mode
  return media?.matches ? 'dark' : 'light'
}

function apply(): void {
  const root = document.documentElement
  root.dataset['skin'] = current.skin
  root.dataset['mode'] = resolvedMode()
  root.style.colorScheme = resolvedMode()
}

export function getAppearance(): Appearance {
  return current
}

export function setAppearance(next: Partial<Appearance>): void {
  current = { ...current, ...next }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Not persisted; still applied for this page view.
  }
  apply()
  listeners.forEach((l) => l())
}

export function subscribeAppearance(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function initAppearance(): void {
  apply()
  media?.addEventListener('change', () => {
    if (current.mode === 'system') {
      apply()
      listeners.forEach((l) => l())
    }
  })
}
