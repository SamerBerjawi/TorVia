import type { IconSvgElement } from '@hugeicons/react'
import type { ReactNode } from 'react'
import { formatBytes, formatRatio, formatSpeed } from '@/domain/format'
import { categoryStats, libraryTotals, ratioDistribution, statusBreakdown, topBy } from '@/domain/stats'
import { STATUS_LABEL } from '@/domain/status'
import { FileIcon } from '../components/FileIcon'
import { Icon } from '../components/Icon'
import { STATUS_TOKEN } from '../components/Status'
import * as I from '../icons'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import { Bars, Donut, LiveSpeed } from './Charts'

function Kpi({ icon, label, value, sub, tone }: { icon: IconSvgElement; label: string; value: string; sub?: string | undefined; tone?: string }) {
  return (
    <div className="kpi" style={tone ? ({ '--c': `var(--st-${tone})` } as React.CSSProperties) : undefined}>
      <span className="kpi__label"><Icon icon={icon} size={14} />{label}</span>
      <span className="kpi__value">{value}</span>
      {sub && <span className="kpi__sub">{sub}</span>}
    </div>
  )
}

export function Panel({ title, sub, children, wide }: { title: string; sub?: string | undefined; children: ReactNode; wide?: boolean }) {
  return (
    <section className={`panel${wide ? ' panel--wide' : ''}`} aria-label={title}>
      <header className="panel__head"><h2>{title}</h2>{sub && <span>{sub}</span>}</header>
      {children}
    </section>
  )
}

const collecting = <p className="panel__empty">Collecting samples — speed history starts when this page opens.</p>

/** Global statistics: live transfer, library composition and sharing. Real data only. */
export default function StatisticsView() {
  const { data, history } = useEngine()
  const openDetails = useUi((s) => s.openDetails)
  const s = data.serverState
  const torrents = [...data.torrents.values()]
  const totals = libraryTotals(torrents)
  const breakdown = statusBreakdown(torrents)
  const cats = categoryStats(torrents).slice(0, 8).map((c) => ({ label: c.category || 'Uncategorised', size: c.size }))
  const ratios = ratioDistribution(torrents)
  const uploaders = topBy(data.torrents, 'upspeed', 6)
  const maxUp = uploaders[0]?.[1].upspeed ?? 1
  const dlColor = 'var(--st-dl)'
  const upColor = 'var(--st-seed)'

  return (
    <div className="stats">
      <div className="kpis">
        <Kpi icon={I.DownloadIcon} tone="dl" label="Download" value={formatSpeed(s.dl_info_speed ?? 0)} sub={`${formatBytes(s.dl_info_data ?? 0)} this session`} />
        <Kpi icon={I.UploadIcon} tone="seed" label="Upload" value={formatSpeed(s.up_info_speed ?? 0)} sub={`${formatBytes(s.up_info_data ?? 0)} this session`} />
        <Kpi icon={I.ArrowDataIcon} label="All-time" value={s.alltime_dl === undefined ? '—' : `↓ ${formatBytes(s.alltime_dl)}`} sub={s.alltime_ul === undefined ? undefined : `↑ ${formatBytes(s.alltime_ul)}`} />
        <Kpi icon={I.RatioIcon} label="Global ratio" value={s.global_ratio ?? '—'} sub={`${totals.completed} of ${totals.count} complete`} />
        <Kpi icon={I.PeersIcon} label="Peers connected" value={s.total_peer_connections === undefined ? '—' : String(s.total_peer_connections)} sub={s.dht_nodes === undefined ? undefined : `DHT ${s.dht_nodes} nodes`} />
        <Kpi icon={I.DiskIcon} label="Library" value={formatBytes(totals.size)} sub={`Free ${s.free_space_on_disk === undefined ? '—' : formatBytes(s.free_space_on_disk)}`} />
      </div>

      <div className="panels">
        <Panel title="Download speed" sub="Live · up to 5 minutes">
          {history.length < 2 ? collecting : <LiveSpeed samples={history} field="dl" color={dlColor} format={formatSpeed} window={300} height={200} />}
        </Panel>
        <Panel title="Upload speed" sub="Live · up to 5 minutes">
          {history.length < 2 ? collecting : <LiveSpeed samples={history} field="up" color={upColor} format={formatSpeed} window={300} height={200} />}
        </Panel>

        <Panel title="Torrents by status" sub={`${totals.count} torrents`}>
          {breakdown.length === 0 ? <p className="panel__empty">No torrents yet.</p> : (
            <div className="ringrow">
              <Donut
                size={190}
                data={breakdown.map((b) => ({ label: STATUS_LABEL[b.status], value: b.count, color: `var(--st-${STATUS_TOKEN[b.status]})` }))}
                center={<><strong>{totals.count}</strong><span>torrents</span></>}
              />
              <ul className="legend">
                {breakdown.map((b) => (
                  <li key={b.status} style={{ '--c': `var(--st-${STATUS_TOKEN[b.status]})` } as React.CSSProperties}>
                    <i aria-hidden="true" />{STATUS_LABEL[b.status]}<span>{b.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel title="Library by category" sub="Total size">
          {cats.length === 0 ? <p className="panel__empty">No torrents yet.</p> : <Bars data={cats} dataKey="size" color="var(--chart-1)" format={(v) => formatBytes(v)} orientation="horizontal" height={Math.max(140, cats.length * 34 + 16)} />}
        </Panel>

        <Panel title="Share ratio" sub="Completed torrents">
          <Bars data={ratios} dataKey="count" color="var(--chart-2)" format={(v) => `${v} torrent${v === 1 ? '' : 's'}`} orientation="vertical" height={200} />
        </Panel>

        <Panel title="Top uploaders now" sub={uploaders.length ? `${uploaders.length} active` : undefined}>
          {uploaders.length === 0 ? <p className="panel__empty">Nothing is uploading right now.</p> : (
            <ol className="toplist">
              {uploaders.map(([hash, t]) => (
                <li key={hash}>
                  <button type="button" onClick={() => { location.hash = '#/'; openDetails(hash) }}>
                    <FileIcon name={t.name} />
                    <span className="toplist__name" title={t.name}>{t.name}</span>
                    <span className="toplist__val">{formatSpeed(t.upspeed)}</span>
                    <span className="toplist__bar" aria-hidden="true"><i style={{ width: `${(t.upspeed / maxUp) * 100}%` }} /></span>
                    <span className="toplist__sub">ratio {formatRatio(t.ratio)}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  )
}
