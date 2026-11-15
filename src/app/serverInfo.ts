import { useSyncExternalStore } from 'react'
import { capabilitiesFor, parseApiVersion, type Capabilities } from '@/api/capabilities'
import { appApi } from '@/api/torrents'

/** qBittorrent version + WebAPI capabilities, fetched once after sign-in. */
export interface ServerInfo {
  status: 'loading' | 'ready' | 'error'
  appVersion: string | null
  apiVersion: string | null
  caps: Capabilities
}

let info: ServerInfo = { status: 'loading', appVersion: null, apiVersion: null, caps: capabilitiesFor(null) }
const listeners = new Set<() => void>()
let started = false

export function loadServerInfo(): void {
  if (started) return
  started = true
  Promise.all([appApi.version(), appApi.webapiVersion()]).then(
    ([app, api]) => {
      info = { status: 'ready', appVersion: app.trim().replace(/^v/, ''), apiVersion: api.trim(), caps: capabilitiesFor(parseApiVersion(api)) }
      listeners.forEach((l) => l())
    },
    () => {
      info = { ...info, status: 'error' }
      started = false // retried on next call
      listeners.forEach((l) => l())
    },
  )
}

export const getServerInfo = () => info
export const useServerInfo = () => useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => info)
