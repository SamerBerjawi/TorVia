import { formatBytes, formatSpeed } from '@/domain/format'
import { SIGNAL_COLUMNS } from '../columns'
import { SelectionBar } from '../actions/SelectionBar'
import { AddButton } from '../components/AddButton'
import { AppearanceMenu } from '../components/AppearanceMenu'
import { SignOutButton } from '../components/Chrome'
import { DetailsPanel } from '../components/DetailsPanel'
import { RouteNav } from '../components/RouteNav'
import { Icon } from '../components/Icon'
import { QueryBar } from '../components/QueryBar'
import { Sparkline } from '../components/Sparkline'
import { AltSpeedToggle, connectionLabel, ConnectionBanner } from '../components/StatusBar'
import { TorrentTable } from '../components/TorrentTable'
import { CloseIcon, GroupIcon, KeyboardIcon, SavedViewIcon } from '../icons'
import { removeView, useSavedViews } from '../savedViews'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import type { LayoutProps } from './types'

/** C · Signal — query-first console: token bar, saved views, grouped rows, keyboard hints. */
export function SignalLayout({ view, narrow, version, route, statistics, ctx }: LayoutProps) {
  const { data, connection, history } = useEngine()
  const { focused, detailsOpen, groupByCategory, setGroupByCategory, setQuery, query, sort } = useUi()
  const saved = useSavedViews()
  const detail = detailsOpen && focused ? data.torrents.get(focused) : undefined
  const s = data.serverState
  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">torvia<span>.</span></span>
        <RouteNav route={route} variant="text" />
        <span className="topbar__spacer" />
        <div className="meters">
          <span className="meter meter--dl"><span className="meter__label">DL</span><Sparkline values={history.map((h) => h.dl).slice(-30)} />{formatSpeed(s.dl_info_speed ?? 0)}</span>
          <span className="meter meter--up"><span className="meter__label">UL</span><Sparkline values={history.map((h) => h.up).slice(-30)} />{formatSpeed(s.up_info_speed ?? 0)}</span>
          <span className="meter meter--conn" data-conn={connection.kind}><i aria-hidden="true" />{connection.kind === 'online' ? 'live' : connectionLabel(connection.kind).toLowerCase()}</span>
        </div>
        <AddButton variant="compact" />
        <AppearanceMenu compact />
        <SignOutButton />
      </header>
      {statistics ? <main className="main main--stats">{statistics}</main> : <>
      <QueryBar view={view} />
      <div className="viewsrow">
        {saved.length > 0 && <Icon icon={SavedViewIcon} size={14} />}
        {saved.map((q) => (
          <span key={q} className="savedview" data-active={q === query || undefined}>
            <button type="button" onClick={() => setQuery(q)}>{q}</button>
            <button type="button" aria-label={`Delete saved view ${q}`} onClick={() => removeView(q)}><Icon icon={CloseIcon} size={11} /></button>
          </span>
        ))}
        <span className="viewsrow__spacer" />
        <label className="toggle">
          <input type="checkbox" checked={groupByCategory} onChange={(e) => setGroupByCategory(e.target.checked)} />
          <Icon icon={GroupIcon} size={14} />Group by category
        </label>
        <span className="viewsrow__meta">Sort {sort.key.replace('_on', '').replace('dlspeed', 'down').replace('upspeed', 'up')} {sort.dir === 'asc' ? '↑' : '↓'} · {view.rows.length} of {view.total} match</span>
      </div>
      <SelectionBar ctx={ctx} variant="bar" />
      <ConnectionBanner />
      <div className="shell__body">
        <main className="main">
          <TorrentTable columns={SIGNAL_COLUMNS} items={groupByCategory ? view.groupedItems : view.flatItems} order={view.order} rowHeight={narrow ? 52 : 38} label="Torrents" emptyText={view.total ? 'Nothing matches this query.' : 'No torrents yet — press N to add one.'} narrow={narrow} ctx={ctx} />
        </main>
        {detail && focused && <DetailsPanel hash={focused} torrent={detail} orientation="side" />}
      </div>
      </>}
      <footer className="statusbar statusbar--hints">
        <Icon icon={KeyboardIcon} size={14} />
        <span>↑↓ move</span><span>space select</span><span>↵ details</span><span>esc clear</span><span>/ query</span>
        <span className="statusbar__spacer" />
        <AltSpeedToggle />
        <span className="statusbar__wide">free {s.free_space_on_disk === undefined ? '—' : formatBytes(s.free_space_on_disk)}{s.dht_nodes !== undefined ? ` · dht ${s.dht_nodes}` : ''}{version ? ` · qbt ${version}` : ''}</span>
      </footer>
    </div>
  )
}
