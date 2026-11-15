import { DetailsIcon } from '../icons'
import { GRAPHITE_COLUMNS } from '../columns'
import { AppearanceMenu } from '../components/AppearanceMenu'
import { BrandMark, SignOutButton } from '../components/Chrome'
import { DetailsPanel } from '../components/DetailsPanel'
import { Icon } from '../components/Icon'
import { SearchBox } from '../components/SearchBox'
import { Sidebar as BaseSidebar } from '../components/Sidebar'
import { ConnectionBanner, StatusBar } from '../components/StatusBar'
import { TorrentTable } from '../components/TorrentTable'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import type { LayoutProps } from './types'

/** A · Graphite — sidebar, table, details on the right. Calm and dense. */
export function GraphiteLayout({ view, narrow, version }: LayoutProps) {
  const { data } = useEngine()
  const { focused, detailsOpen, openDetails, closeDetails, selected, clearSelection } = useUi()
  const detail = detailsOpen && focused ? data.torrents.get(focused) : undefined
  return (
    <div className="shell">
      <div className="shell__body">
        <Sidebar view={view} version={version} />
        <main className="main">
          <div className="toolbar">
            <SearchBox placeholder="Filter — try cat:linux size:>1GB" hint="/" />
            <span className="toolbar__count">{view.rows.length === view.total ? `${view.total} torrents` : `${view.rows.length} of ${view.total}`}</span>
            <button type="button" className="iconbtn" aria-label={detailsOpen ? 'Hide details' : 'Show details'} aria-pressed={detailsOpen} disabled={!focused} onClick={() => (detailsOpen ? closeDetails() : focused && openDetails(focused))}>
              <Icon icon={DetailsIcon} />
            </button>
          </div>
          {selected.size > 1 && (
            <div className="selbar" role="status">
              <strong>{selected.size} selected</strong>
              <button type="button" className="linkbtn" onClick={clearSelection}>Clear</button>
            </div>
          )}
          <ConnectionBanner />
          <TorrentTable columns={GRAPHITE_COLUMNS} items={view.flatItems} order={view.order} rowHeight={narrow ? 52 : 44} label="Torrents" emptyText={view.total ? 'No torrents match these filters.' : 'No torrents yet.'} narrow={narrow} />
        </main>
        {detail && focused && <DetailsPanel hash={focused} torrent={detail} orientation="side" />}
      </div>
      <StatusBar>{version && <span className="statusbar__item statusbar__wide">qBittorrent {version}</span>}</StatusBar>
    </div>
  )
}

function Sidebar({ view, version }: Pick<LayoutProps, 'view' | 'version'>) {
  return (
    <BaseSidebar
      view={view}
      showStatus
      header={
        <div className="sidebar__brand">
          <BrandMark />
          <span className="brandname">Nuvora</span>
          {version && <span className="sidebar__version">qBittorrent {version}</span>}
        </div>
      }
      footer={
        <div className="sidebar__footer">
          <AppearanceMenu />
          <SignOutButton />
        </div>
      }
    />
  )
}
