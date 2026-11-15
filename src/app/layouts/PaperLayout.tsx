import { useRef } from 'react'
import { STATUS_FILTER_LABEL, type StatusFilter } from '@/domain/filters'
import { PAPER_COLUMNS } from '../columns'
import { SelectionBar } from '../actions/SelectionBar'
import { AddButton } from '../components/AddButton'
import { AppearanceMenu } from '../components/AppearanceMenu'
import { BrandMark, SignOutButton } from '../components/Chrome'
import { DetailsPanel } from '../components/DetailsPanel'
import { RouteNav } from '../components/RouteNav'
import { Icon } from '../components/Icon'
import { SearchBox } from '../components/SearchBox'
import { Sidebar, STATUS_ICON } from '../components/Sidebar'
import { Splitter } from '../components/Splitter'
import { ConnectionBanner, StatusBar } from '../components/StatusBar'
import { TorrentTable } from '../components/TorrentTable'
import { usePaneHeight } from '../tablePrefs'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import type { LayoutProps } from './types'

const SEGMENTS: StatusFilter[] = ['all', 'downloading', 'seeding', 'completed', 'stopped', 'errored']

/** B · Paper — native-desktop toolbar with status segments, slim source list, details pane below. */
export function PaperLayout({ view, narrow, version, route, page, ctx }: LayoutProps) {
  const { data } = useEngine()
  const { status, setStatus, focused, detailsOpen } = useUi()
  const detail = detailsOpen && focused ? data.torrents.get(focused) : undefined
  const mainRef = useRef<HTMLElement>(null)
  const [paneHeight, setPaneHeight] = usePaneHeight()
  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand"><BrandMark /><span className="brandname">Torvia</span></div>
        <RouteNav route={route} variant="tabs" />
        <span className="topbar__spacer" />
        {!page && <SelectionBar ctx={ctx} variant="toolbar" />}
        {!page && <SearchBox placeholder="Search" />}
        <AddButton variant="compact" />
        <AppearanceMenu compact />
        <SignOutButton />
      </header>
      {!page && (
        <div className="scopebar">
        <div className="segmented segmented--toolbar" role="group" aria-label="Status filter">
            {SEGMENTS.map((s) => (
              <button key={s} type="button" aria-pressed={status === s} data-tone={s === 'errored' ? 'err' : undefined} onClick={() => setStatus(s)}>
                <Icon icon={STATUS_ICON[s]} size={14} />
                {STATUS_FILTER_LABEL[s]} <span className="segmented__count">{view.counts[s]}</span>
              </button>
            ))}
          </div>
          <span className="scopebar__count">{view.rows.length === view.total ? `${view.total} torrents` : `${view.rows.length} of ${view.total} shown`}</span>
        </div>
      )}
      <div className="shell__body">
        {page ? <main className="main main--stats" tabIndex={0} aria-label="Content">{page}</main> : <>
        <Sidebar view={view} showStatus={false} />
        <main className="main" ref={mainRef}>
          <ConnectionBanner />
          <TorrentTable columns={PAPER_COLUMNS} items={view.flatItems} order={view.order} rowHeight={narrow ? 52 : 40} label="Torrents" emptyText={view.total ? 'No torrents match these filters.' : 'No torrents yet.'} narrow={narrow} ctx={ctx} />
          {detail && focused && (
            <>
              {!narrow && <Splitter height={paneHeight} onChange={setPaneHeight} container={mainRef} />}
              <DetailsPanel hash={focused} torrent={detail} orientation="bottom" height={narrow ? undefined : paneHeight} />
            </>
          )}
        </main>
        </>}
      </div>
      <StatusBar>
        {version && <span className="statusbar__item statusbar__wide">qBittorrent {version}</span>}
      </StatusBar>
    </div>
  )
}
