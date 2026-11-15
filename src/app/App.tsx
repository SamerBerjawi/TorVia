import { useEffect } from 'react'
import { logout } from '@/api/auth'
import { formatBytes, formatSpeed } from '@/domain/format'
import { engine, useEngine } from './store'
import { TorrentTable } from './TorrentTable'

export function App() {
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [])

  const { data, connection } = useEngine()
  const s = data.serverState

  if (connection.kind === 'unauthenticated') {
    return (
      <div className="empty" role="alert">
        <div>
          <p>Your session has ended.</p>
          <button className="btn primary" onClick={() => location.reload()}>Sign in again</button>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Nuvora</span>
        <span className="spacer" />
        <button className="btn" onClick={() => void logout().then(() => location.reload())}>Sign out</button>
      </header>
      <main style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {connection.kind === 'degraded' && (
          <div className="banner" data-tone="warn" role="status">
            Connection to qBittorrent lost — retrying. Showing last known data.
          </div>
        )}
        {connection.kind === 'connecting' ? <div className="empty">Connecting…</div> : <TorrentTable torrents={data.torrents} />}
      </main>
      <footer className="statusbar">
        <span><i className="led" data-state={connection.kind} />{connection.kind === 'online' ? 'Connected' : connection.kind === 'connecting' ? 'Connecting' : 'Reconnecting'}</span>
        <span>↓ {formatSpeed(s.dl_info_speed ?? 0)}</span>
        <span>↑ {formatSpeed(s.up_info_speed ?? 0)}</span>
        <span>Free {s.free_space_on_disk === undefined ? '—' : formatBytes(s.free_space_on_disk)}</span>
        <span className="spacer" />
        <span>{data.torrents.size} torrents</span>
      </footer>
    </div>
  )
}
