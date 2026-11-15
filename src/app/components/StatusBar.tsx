import type { ReactNode } from 'react'
import { formatBytes, formatSpeed } from '@/domain/format'
import { ConnectedIcon, DisconnectedIcon, DiskIcon, DownloadIcon, UploadIcon } from '../icons'
import { useEngine } from '../store'
import { Icon } from './Icon'

export function connectionLabel(kind: string): string {
  return kind === 'online' ? 'Connected' : kind === 'connecting' ? 'Connecting' : 'Reconnecting'
}

export function StatusBar({ children }: { children?: ReactNode }) {
  const { data, connection } = useEngine()
  const s = data.serverState
  return (
    <footer className="statusbar">
      <span className="statusbar__item" data-conn={connection.kind}>
        <Icon icon={connection.kind === 'online' ? ConnectedIcon : DisconnectedIcon} size={14} />
        {connectionLabel(connection.kind)}
      </span>
      <span className="statusbar__item"><Icon icon={DownloadIcon} size={14} />{formatSpeed(s.dl_info_speed ?? 0)}</span>
      <span className="statusbar__item"><Icon icon={UploadIcon} size={14} />{formatSpeed(s.up_info_speed ?? 0)}</span>
      <span className="statusbar__item"><Icon icon={DiskIcon} size={14} />Free {s.free_space_on_disk === undefined ? '—' : formatBytes(s.free_space_on_disk)}</span>
      {s.dht_nodes !== undefined && <span className="statusbar__item statusbar__wide">DHT {s.dht_nodes} nodes</span>}
      <span className="statusbar__spacer" />
      {children}
    </footer>
  )
}

export function ConnectionBanner() {
  const { connection } = useEngine()
  if (connection.kind !== 'degraded') return null
  return (
    <div className="banner" role="status">
      <Icon icon={DisconnectedIcon} size={14} />
      Connection to qBittorrent lost — retrying. Showing data from {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleTimeString() : 'before the disconnect'}.
    </div>
  )
}
