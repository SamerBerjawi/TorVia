import { useSyncExternalStore } from 'react'
import { isNewer, latestFromApi, type LatestRelease } from '@/domain/version'

/**
 * "Update available" notice. This is the ONLY request Torvia makes outside qBittorrent: an anonymous GET to GitHub's
 * public releases API at most once a day (no cookies, no referrer, nothing identifying beyond the IP address GitHub
 * sees for any request). Can be switched off in Settings; see docs/adr/0014-update-check.md.
 */
export const CURRENT_VERSION = __TORVIA_VERSION__
const REPO = 'SamerBerjawi/torvia'
const KEY = 'torvia.updates'
const DAY = 24 * 60 * 60 * 1000

export interface UpdateState {
  enabled: boolean
  checkedAt: number | null
  latest: LatestRelease | null
  /** Version the user dismissed; the notice returns only for a newer one. */
  dismissed: string | null
  error: string | null
  checking: boolean
}

const initial: UpdateState = { enabled: true, checkedAt: null, latest: null, dismissed: null, error: null, checking: false }

function read(): UpdateState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<UpdateState> | null
    if (!raw || typeof raw !== 'object') return initial
    return {
      ...initial,
      enabled: raw.enabled !== false,
      checkedAt: typeof raw.checkedAt === 'number' ? raw.checkedAt : null,
      latest: latestFromApi(raw.latest && { tag_name: `v${raw.latest.version}`, html_url: raw.latest.url }),
      dismissed: typeof raw.dismissed === 'string' ? raw.dismissed : null,
    }
  } catch {
    return initial
  }
}

let state = read()
const listeners = new Set<() => void>()
function set(patch: Partial<UpdateState>) {
  state = { ...state, ...patch }
  try { localStorage.setItem(KEY, JSON.stringify({ enabled: state.enabled, checkedAt: state.checkedAt, latest: state.latest, dismissed: state.dismissed })) } catch { /* session only */ }
  listeners.forEach((l) => l())
}

export const useUpdates = (): UpdateState => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => state)
export const setUpdateChecks = (enabled: boolean) => { set({ enabled, error: null }); if (enabled) void checkForUpdates(true) }
export const dismissUpdate = (version: string) => set({ dismissed: version })

/** A newer release than the one running, whether or not the user dismissed the banner. */
export const availableUpdate = (s: UpdateState): LatestRelease | null =>
  s.enabled && s.latest && isNewer(s.latest.version, CURRENT_VERSION) ? s.latest : null

/** The update to announce in the banner right now: available and not dismissed. */
export const pendingUpdate = (s: UpdateState): LatestRelease | null => {
  const a = availableUpdate(s)
  return a && s.dismissed !== a.version ? a : null
}

/** Checks GitHub unless disabled or checked within the last day (`force` ignores the schedule). */
export async function checkForUpdates(force = false): Promise<void> {
  if (!state.enabled || state.checking) return
  if (!force && state.checkedAt !== null && Date.now() - state.checkedAt < DAY) return
  set({ checking: true, error: null })
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 404) { set({ checking: false, checkedAt: Date.now(), latest: null }); return } // no release yet
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
    const latest = latestFromApi(await res.json())
    set({ checking: false, checkedAt: Date.now(), latest })
  } catch (e) {
    // Not fatal and not worth a toast: surfaced in Settings, retried on the next page load.
    set({ checking: false, error: e instanceof Error ? e.message : 'Could not reach GitHub' })
  }
}
