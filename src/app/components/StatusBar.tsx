import type { ReactNode } from 'react'
import { formatBytes, formatSpeed } from '@/domain/format'
import { transferApi } from '@/api/torrents'
import { openDialog } from '../dialogs/dialogStore'
import { run } from '../actions/run'
import { ConnectedIcon, DisconnectedIcon, DiskIcon, DownloadIcon, SpeedIcon, UploadIcon } from '../icons'
import { CURRENT_VERSION } from '../updates'
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
      <SpeedLimitsButton />
      <AltSpeedToggle />
      <a className="statusbar__item statusbar__wide statusbar__ver" href="#/settings" title="About Torvia (Settings)">Torvia {CURRENT_VERSION}</a>
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

/** Alternative speed limits on/off; state comes from sync (server_state.use_alt_speed_limits). */
export function AltSpeedToggle() {
  const on = useEngine().data.serverState.use_alt_speed_limits === true
  return (
    <button type="button" className="altspeed" aria-pressed={on} title="Alternative speed limits"
      onClick={() => void run(() => transferApi.toggleSpeedLimitsMode(), { success: on ? 'Alternative speed limits off' : 'Alternative speed limits on', failure: 'Could not toggle speed limits' })}>
      <Icon icon={SpeedIcon} size={14} />Alt speed {on ? 'on' : 'off'}
    </button>
  )
}

/** Opens the global speed limits dialog; shows the limits currently in force (from sync). */
function SpeedLimitsButton() {
  const s = useEngine().data.serverState
  const limit = (b: number | undefined) => (b && b > 0 ? formatSpeed(b) : '∞')
  return (
    <button type="button" className="speedlimits" title="Global speed limits" aria-label={`Global speed limits: download ${limit(s.dl_rate_limit)}, upload ${limit(s.up_rate_limit)}`} onClick={() => openDialog({ kind: 'global-speed' })}>
      <Icon icon={SpeedIcon} size={14} />Limits ↓ {limit(s.dl_rate_limit)} ↑ {limit(s.up_rate_limit)}
    </button>
  )
}
