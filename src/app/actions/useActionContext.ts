import { useMemo } from 'react'
import { selectionFacts } from '@/domain/selection'
import { useSearchAvailable } from '../searchAvailability'
import { useServerInfo } from '../serverInfo'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import type { ActionContext } from './catalogue'

/** Builds the action context from the live selection (or the focused row when nothing is selected). */
export function useActionContext(order: readonly string[]): ActionContext {
  const { data } = useEngine()
  const { selected, focused } = useUi()
  const { caps } = useServerInfo()
  const searchAvailable = useSearchAvailable()
  return useMemo(() => {
    const picked = selected.size > 0 ? order.filter((h) => selected.has(h)) : focused && data.torrents.has(focused) ? [focused] : []
    // Selected rows hidden by the current filter still count.
    for (const h of selected) if (!picked.includes(h) && data.torrents.has(h)) picked.push(h)
    const torrents = picked.map((h) => data.torrents.get(h)).filter((t) => t !== undefined)
    return { hashes: picked, torrents, facts: selectionFacts(torrents), caps, server: data.serverState, searchAvailable }
  }, [selected, focused, order, data, caps, searchAvailable])
}

/** Context for an explicit set of hashes (dialogs opened for a fixed selection). */
export function useTorrentsByHash(hashes: readonly string[]) {
  const { data } = useEngine()
  return useMemo(() => hashes.map((h) => data.torrents.get(h)).filter((t) => t !== undefined), [hashes, data.torrents])
}
