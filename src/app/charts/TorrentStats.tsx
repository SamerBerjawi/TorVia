import type { Torrent } from '@/api/types'
import { formatBytes, formatPercent, formatRatio, formatSpeed } from '@/domain/format'
import { formatDuration } from '@/domain/stats'
import { useEngine } from '../store'
import { LiveSpeed, Rings } from './Charts'

function Meter({ label, value, of, color }: { label: string; value: number; of: number; color: string }) {
  const pct = of > 0 ? Math.min(1, value / of) : 0
  return (
    <div className="meter2">
      <div className="meter2__head"><span>{label}</span><span><strong>{value.toLocaleString()}</strong> of {of.toLocaleString()}</span></div>
      <span className="meter2__track" aria-hidden="true"><i style={{ width: `${pct * 100}%`, background: color }} /></span>
    </div>
  )
}

const ago = (unix: number) => (unix > 0 ? `${formatDuration(Date.now() / 1000 - unix)} ago` : '—')

/** Per-torrent statistics: live speed, progress/ratio/availability rings, swarm and timing. */
export default function TorrentStats({ hash, torrent: t }: { hash: string; torrent: Torrent }) {
  const { torrentHistory } = useEngine()
  const samples = torrentHistory.get(hash) ?? []
  const target = t.ratio_limit > 0 ? t.ratio_limit : t.max_ratio > 0 ? t.max_ratio : 1
  const avail = t.availability ?? -1
  const rings = [
    { label: 'Progress', value: t.progress, maxValue: 1, color: 'var(--st-dl)' },
    { label: `Ratio (target ${formatRatio(target)})`, value: Math.min(Math.max(0, t.ratio), target), maxValue: target, color: 'var(--st-seed)' },
    ...(avail >= 0 ? [{ label: 'Availability', value: Math.min(avail, 1), maxValue: 1, color: 'var(--st-check)' }] : []),
  ]
  return (
    <div className="tstats">
      <section className="tstats__sec" aria-label="Progress and sharing">
      <div className="ringrow ringrow--compact">
        <Rings size={156} strokeWidth={7} data={rings} center={<><strong>{formatPercent(t.progress)}</strong><span>done</span></>} />
        <ul className="legend">
          {rings.map((r) => (
            <li key={r.label} style={{ '--c': r.color } as React.CSSProperties}>
              <i aria-hidden="true" />{r.label}
              <span>{r.label === 'Progress' ? formatPercent(t.progress) : r.label === 'Availability' ? avail.toFixed(2) : formatRatio(t.ratio)}</span>
            </li>
          ))}
        </ul>
      </div>
      </section>

      <section className="tstats__sec" aria-label="Transfer speed">
      <h3 className="tstats__h">Transfer speed</h3>
      {samples.length < 2 ? (
        <p className="panel__empty">No transfer activity since Torvia opened.</p>
      ) : (
        <>
          <LiveSpeed samples={samples} field="dl" color="var(--st-dl)" format={formatSpeed} window={180} height={110} ticks={2} />
          <LiveSpeed samples={samples} field="up" color="var(--st-seed)" format={formatSpeed} window={180} height={110} ticks={2} />
        </>
      )}
      </section>

      <section className="tstats__sec" aria-label="Swarm">
      <h3 className="tstats__h">Swarm</h3>
      <Meter label="Seeds connected" value={t.num_seeds ?? 0} of={Math.max(t.num_complete ?? 0, t.num_seeds ?? 0)} color="var(--st-seed)" />
      <Meter label="Peers connected" value={t.num_leechs ?? 0} of={Math.max(t.num_incomplete ?? 0, t.num_leechs ?? 0)} color="var(--st-dl)" />
      </section>

      <section className="tstats__sec" aria-label="Totals">
      <h3 className="tstats__h">Totals</h3>
      <dl className="details__grid details__grid--flush">
        <div className="details__field"><dt>Downloaded</dt><dd>{formatBytes(t.downloaded ?? 0)}</dd></div>
        <div className="details__field"><dt>Uploaded</dt><dd>{formatBytes(t.uploaded ?? 0)}</dd></div>
        <div className="details__field"><dt>Time active</dt><dd>{formatDuration(t.time_active ?? 0)}</dd></div>
        <div className="details__field"><dt>Seeding time</dt><dd>{formatDuration(t.seeding_time ?? 0)}</dd></div>
        <div className="details__field"><dt>Last activity</dt><dd>{ago(t.last_activity ?? 0)}</dd></div>
        <div className="details__field"><dt>Upload / day</dt><dd>{(t.time_active ?? 0) > 3600 ? formatBytes(((t.uploaded ?? 0) / (t.time_active ?? 1)) * 86400) : '—'}</dd></div>
      </dl>
      </section>
    </div>
  )
}
